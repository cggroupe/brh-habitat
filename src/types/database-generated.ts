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
      brh_admin_profile_warnings: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          message: string
          metadata: Json
          resolved_at: string | null
          resolved_by: string | null
          resolved_notes: string | null
          severity: string
          target_id: string
          target_type: string
          warning_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          message: string
          metadata?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_notes?: string | null
          severity?: string
          target_id: string
          target_type: string
          warning_type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          message?: string
          metadata?: Json
          resolved_at?: string | null
          resolved_by?: string | null
          resolved_notes?: string | null
          severity?: string
          target_id?: string
          target_type?: string
          warning_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_admin_profile_warnings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_admin_profile_warnings_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
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
      brh_agence_contributions: {
        Row: {
          adresse: string
          agence_id: string
          assigned_pro_company_id: string | null
          audit_id: string | null
          brh_prospect_id: string | null
          budget_estime_eur: number | null
          chantier_montant_ttc_cents: number | null
          code_postal: string | null
          commission_amount_cents: number | null
          commission_paid_at: string | null
          commission_pct: number | null
          commune: string | null
          consent_contact: boolean
          contexte: string | null
          created_at: string
          departement: string | null
          etiquette_dpe_actuelle: string | null
          id: string
          proprietaire_email: string | null
          proprietaire_nom: string | null
          proprietaire_prenom: string | null
          proprietaire_telephone: string | null
          quote_id: string | null
          rejected_reason: string | null
          status: string
          submitted_by: string | null
          surface_estimee_m2: number | null
          travaux_envisages: string[] | null
          type_batiment: string | null
          updated_at: string
          urgence: string | null
        }
        Insert: {
          adresse: string
          agence_id: string
          assigned_pro_company_id?: string | null
          audit_id?: string | null
          brh_prospect_id?: string | null
          budget_estime_eur?: number | null
          chantier_montant_ttc_cents?: number | null
          code_postal?: string | null
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          commission_pct?: number | null
          commune?: string | null
          consent_contact?: boolean
          contexte?: string | null
          created_at?: string
          departement?: string | null
          etiquette_dpe_actuelle?: string | null
          id?: string
          proprietaire_email?: string | null
          proprietaire_nom?: string | null
          proprietaire_prenom?: string | null
          proprietaire_telephone?: string | null
          quote_id?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_by?: string | null
          surface_estimee_m2?: number | null
          travaux_envisages?: string[] | null
          type_batiment?: string | null
          updated_at?: string
          urgence?: string | null
        }
        Update: {
          adresse?: string
          agence_id?: string
          assigned_pro_company_id?: string | null
          audit_id?: string | null
          brh_prospect_id?: string | null
          budget_estime_eur?: number | null
          chantier_montant_ttc_cents?: number | null
          code_postal?: string | null
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          commission_pct?: number | null
          commune?: string | null
          consent_contact?: boolean
          contexte?: string | null
          created_at?: string
          departement?: string | null
          etiquette_dpe_actuelle?: string | null
          id?: string
          proprietaire_email?: string | null
          proprietaire_nom?: string | null
          proprietaire_prenom?: string | null
          proprietaire_telephone?: string | null
          quote_id?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_by?: string | null
          surface_estimee_m2?: number | null
          travaux_envisages?: string[] | null
          type_batiment?: string | null
          updated_at?: string
          urgence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_contributions_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_contributions_assigned_pro_company_id_fkey"
            columns: ["assigned_pro_company_id"]
            isOneToOne: false
            referencedRelation: "brh_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_contributions_brh_prospect_id_fkey"
            columns: ["brh_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_contributions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "brh_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_contributions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_favoris_parcelles: {
        Row: {
          added_by: string | null
          agence_id: string
          created_at: string
          id: string
          notes: string | null
          parcelle_code_postal: string | null
          parcelle_commune: string | null
          parcelle_contenance_m2: number | null
          parcelle_departement: string | null
          parcelle_idu: string
          priorite: string
          related_prospect_id: string | null
          status: string
          status_updated_at: string
          tags: string[] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          added_by?: string | null
          agence_id: string
          created_at?: string
          id?: string
          notes?: string | null
          parcelle_code_postal?: string | null
          parcelle_commune?: string | null
          parcelle_contenance_m2?: number | null
          parcelle_departement?: string | null
          parcelle_idu: string
          priorite?: string
          related_prospect_id?: string | null
          status?: string
          status_updated_at?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          added_by?: string | null
          agence_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          parcelle_code_postal?: string | null
          parcelle_commune?: string | null
          parcelle_contenance_m2?: number | null
          parcelle_departement?: string | null
          parcelle_idu?: string
          priorite?: string
          related_prospect_id?: string | null
          status?: string
          status_updated_at?: string
          tags?: string[] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_favoris_parcelles_added_by_fkey"
            columns: ["added_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_favoris_parcelles_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_favoris_parcelles_related_prospect_id_fkey"
            columns: ["related_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_members: {
        Row: {
          agence_id: string
          id: string
          invited_at: string
          invited_by_profile_id: string | null
          joined_at: string
          member_role: string
          permissions: Json
          profile_id: string
        }
        Insert: {
          agence_id: string
          id?: string
          invited_at?: string
          invited_by_profile_id?: string | null
          joined_at?: string
          member_role?: string
          permissions?: Json
          profile_id: string
        }
        Update: {
          agence_id?: string
          id?: string
          invited_at?: string
          invited_by_profile_id?: string | null
          joined_at?: string
          member_role?: string
          permissions?: Json
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_members_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_members_invited_by_profile_id_fkey"
            columns: ["invited_by_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_members_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_progression: {
        Row: {
          agence_id: string
          bonus_leads_consumed: number
          bonus_leads_unlocked: number
          bonuses_period_start: string
          chantiers_completes: number
          chantiers_signes: number
          contribution_consumed: number
          contribution_unlocked: number
          contributions_count: number
          contributions_qualified: number
          created_at: string
          referral_consumed: number
          referral_unlocked: number
          social_consumed: number
          social_unlocked: number
          stats_updated_at: string
          tier: string
          total_commission_due_cents: number
          total_commission_paid_cents: number
          updated_at: string
        }
        Insert: {
          agence_id: string
          bonus_leads_consumed?: number
          bonus_leads_unlocked?: number
          bonuses_period_start?: string
          chantiers_completes?: number
          chantiers_signes?: number
          contribution_consumed?: number
          contribution_unlocked?: number
          contributions_count?: number
          contributions_qualified?: number
          created_at?: string
          referral_consumed?: number
          referral_unlocked?: number
          social_consumed?: number
          social_unlocked?: number
          stats_updated_at?: string
          tier?: string
          total_commission_due_cents?: number
          total_commission_paid_cents?: number
          updated_at?: string
        }
        Update: {
          agence_id?: string
          bonus_leads_consumed?: number
          bonus_leads_unlocked?: number
          bonuses_period_start?: string
          chantiers_completes?: number
          chantiers_signes?: number
          contribution_consumed?: number
          contribution_unlocked?: number
          contributions_count?: number
          contributions_qualified?: number
          created_at?: string
          referral_consumed?: number
          referral_unlocked?: number
          social_consumed?: number
          social_unlocked?: number
          stats_updated_at?: string
          tier?: string
          total_commission_due_cents?: number
          total_commission_paid_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_progression_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: true
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_referral_audit: {
        Row: {
          actor_profile_id: string | null
          chain_level: number
          commission_amount_cents: number
          commission_id: string
          created_at: string
          id: string
          leads_bonus_amount: number
          new_status: string
          notes: string | null
          old_status: string | null
        }
        Insert: {
          actor_profile_id?: string | null
          chain_level: number
          commission_amount_cents: number
          commission_id: string
          created_at?: string
          id?: string
          leads_bonus_amount: number
          new_status: string
          notes?: string | null
          old_status?: string | null
        }
        Update: {
          actor_profile_id?: string | null
          chain_level?: number
          commission_amount_cents?: number
          commission_id?: string
          created_at?: string
          id?: string
          leads_bonus_amount?: number
          new_status?: string
          notes?: string | null
          old_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_referral_audit_actor_profile_id_fkey"
            columns: ["actor_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_referral_audit_commission_id_fkey"
            columns: ["commission_id"]
            isOneToOne: false
            referencedRelation: "brh_agence_referral_commissions"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_referral_commissions: {
        Row: {
          chain_level: number
          commission_amount_cents: number
          created_at: string
          id: string
          leads_bonus_amount: number
          notes: string | null
          paid_at: string | null
          partner_contract_id: string | null
          recruited_agence_id: string
          recruiter_agence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          chain_level?: number
          commission_amount_cents?: number
          created_at?: string
          id?: string
          leads_bonus_amount?: number
          notes?: string | null
          paid_at?: string | null
          partner_contract_id?: string | null
          recruited_agence_id: string
          recruiter_agence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          chain_level?: number
          commission_amount_cents?: number
          created_at?: string
          id?: string
          leads_bonus_amount?: number
          notes?: string | null
          paid_at?: string | null
          partner_contract_id?: string | null
          recruited_agence_id?: string
          recruiter_agence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_referral_commissions_partner_contract_id_fkey"
            columns: ["partner_contract_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_referral_commissions_recruited_agence_id_fkey"
            columns: ["recruited_agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_referral_commissions_recruiter_agence_id_fkey"
            columns: ["recruiter_agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_simulations: {
        Row: {
          adresse: string | null
          agence_id: string
          cep_kwh_ep_m2_an: number | null
          code_insee: string | null
          code_postal: string | null
          commune: string | null
          created_at: string
          created_by: string | null
          etiquette_dpe: string | null
          id: string
          inputs: Json
          lead_assignment_id: string | null
          notes: string | null
          prospect_dpe_id: number | null
          result: Json | null
          scenarios: Json | null
          titre: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          agence_id: string
          cep_kwh_ep_m2_an?: number | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          created_by?: string | null
          etiquette_dpe?: string | null
          id?: string
          inputs: Json
          lead_assignment_id?: string | null
          notes?: string | null
          prospect_dpe_id?: number | null
          result?: Json | null
          scenarios?: Json | null
          titre: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          agence_id?: string
          cep_kwh_ep_m2_an?: number | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          created_by?: string | null
          etiquette_dpe?: string | null
          id?: string
          inputs?: Json
          lead_assignment_id?: string | null
          notes?: string | null
          prospect_dpe_id?: number | null
          result?: Json | null
          scenarios?: Json | null
          titre?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_simulations_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_simulations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_simulations_lead_assignment_id_fkey"
            columns: ["lead_assignment_id"]
            isOneToOne: false
            referencedRelation: "brh_lead_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_simulations_prospect_dpe_id_fkey"
            columns: ["prospect_dpe_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_agence_social_posts: {
        Row: {
          admin_notes: string | null
          agence_id: string
          created_at: string
          description: string | null
          expiry_check_date: string | null
          expiry_confirmed: boolean | null
          id: string
          platform: string
          post_type: string
          post_url: string
          rejection_reason: string | null
          reward_leads: number
          rewarded_at: string | null
          screenshot_path: string | null
          status: string
          submitted_by: string | null
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          agence_id: string
          created_at?: string
          description?: string | null
          expiry_check_date?: string | null
          expiry_confirmed?: boolean | null
          id?: string
          platform: string
          post_type?: string
          post_url: string
          rejection_reason?: string | null
          reward_leads?: number
          rewarded_at?: string | null
          screenshot_path?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          agence_id?: string
          created_at?: string
          description?: string | null
          expiry_check_date?: string | null
          expiry_confirmed?: boolean | null
          id?: string
          platform?: string
          post_type?: string
          post_url?: string
          rejection_reason?: string | null
          reward_leads?: number
          rewarded_at?: string | null
          screenshot_path?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_agence_social_posts_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_agence_social_posts_submitted_by_fkey"
            columns: ["submitted_by"]
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
          custom_quota: number | null
          id: string
          monthly_lead_quota: number | null
          quota_period: string
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
          custom_quota?: number | null
          id?: string
          monthly_lead_quota?: number | null
          quota_period?: string
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
          custom_quota?: number | null
          id?: string
          monthly_lead_quota?: number | null
          quota_period?: string
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
          referred_by_agence_id: string | null
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
          referred_by_agence_id?: string | null
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
          referred_by_agence_id?: string | null
          representant?: string | null
          siret?: string | null
          site_web?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_agences_immo_referred_by_agence_id_fkey"
            columns: ["referred_by_agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
        ]
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
          assigned_employee_id: string | null
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
          assigned_employee_id?: string | null
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
          assigned_employee_id?: string | null
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
            foreignKeyName: "brh_appointments_assigned_employee_id_fkey"
            columns: ["assigned_employee_id"]
            isOneToOne: false
            referencedRelation: "brh_employees"
            referencedColumns: ["id"]
          },
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
      brh_artisan_chiffrages: {
        Row: {
          adresse_chantier: string | null
          artisan_id: string
          client_nom: string | null
          contribution_id: string | null
          created_at: string
          created_by: string | null
          id: string
          label: string | null
          marge_pct: number | null
          ouvrages: Json
          pdf_url: string | null
          simulation_id: string | null
          status: string
          total_ht_cents: number
          total_marge_cents: number
          total_ttc_cents: number
          tva_pct: number | null
          updated_at: string
        }
        Insert: {
          adresse_chantier?: string | null
          artisan_id: string
          client_nom?: string | null
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          marge_pct?: number | null
          ouvrages: Json
          pdf_url?: string | null
          simulation_id?: string | null
          status?: string
          total_ht_cents?: number
          total_marge_cents?: number
          total_ttc_cents?: number
          tva_pct?: number | null
          updated_at?: string
        }
        Update: {
          adresse_chantier?: string | null
          artisan_id?: string
          client_nom?: string | null
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string | null
          marge_pct?: number | null
          ouvrages?: Json
          pdf_url?: string | null
          simulation_id?: string | null
          status?: string
          total_ht_cents?: number
          total_marge_cents?: number
          total_ttc_cents?: number
          tva_pct?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_chiffrages_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_chiffrages_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "brh_artisan_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_chiffrages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_chiffrages_simulation_id_fkey"
            columns: ["simulation_id"]
            isOneToOne: false
            referencedRelation: "brh_artisan_simulations"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_artisan_contributions: {
        Row: {
          adresse: string
          artisan_id: string
          audit_id: string | null
          brh_prospect_id: string | null
          budget_estime_cents: number | null
          chantier_montant_ttc_cents: number | null
          code_postal: string | null
          commission_amount_cents: number | null
          commission_paid_at: string | null
          commission_pct: number | null
          commune: string | null
          consent_contact: boolean
          contexte_rencontre: string | null
          created_at: string
          departement: string | null
          etiquette_dpe_actuelle: string | null
          id: string
          proprietaire_email: string | null
          proprietaire_nom: string | null
          proprietaire_prenom: string | null
          proprietaire_telephone: string | null
          quote_id: string | null
          rejected_reason: string | null
          status: string
          submitted_by: string | null
          surface_estimee_m2: number | null
          travaux_envisages: string[] | null
          type_batiment: string | null
          updated_at: string
          urgence: string | null
        }
        Insert: {
          adresse: string
          artisan_id: string
          audit_id?: string | null
          brh_prospect_id?: string | null
          budget_estime_cents?: number | null
          chantier_montant_ttc_cents?: number | null
          code_postal?: string | null
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          commission_pct?: number | null
          commune?: string | null
          consent_contact?: boolean
          contexte_rencontre?: string | null
          created_at?: string
          departement?: string | null
          etiquette_dpe_actuelle?: string | null
          id?: string
          proprietaire_email?: string | null
          proprietaire_nom?: string | null
          proprietaire_prenom?: string | null
          proprietaire_telephone?: string | null
          quote_id?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_by?: string | null
          surface_estimee_m2?: number | null
          travaux_envisages?: string[] | null
          type_batiment?: string | null
          updated_at?: string
          urgence?: string | null
        }
        Update: {
          adresse?: string
          artisan_id?: string
          audit_id?: string | null
          brh_prospect_id?: string | null
          budget_estime_cents?: number | null
          chantier_montant_ttc_cents?: number | null
          code_postal?: string | null
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          commission_pct?: number | null
          commune?: string | null
          consent_contact?: boolean
          contexte_rencontre?: string | null
          created_at?: string
          departement?: string | null
          etiquette_dpe_actuelle?: string | null
          id?: string
          proprietaire_email?: string | null
          proprietaire_nom?: string | null
          proprietaire_prenom?: string | null
          proprietaire_telephone?: string | null
          quote_id?: string | null
          rejected_reason?: string | null
          status?: string
          submitted_by?: string | null
          surface_estimee_m2?: number | null
          travaux_envisages?: string[] | null
          type_batiment?: string | null
          updated_at?: string
          urgence?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_contributions_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_contributions_brh_prospect_id_fkey"
            columns: ["brh_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_contributions_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "brh_quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_contributions_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      brh_artisan_progression: {
        Row: {
          artisan_id: string
          bonus_leads_consumed: number
          bonus_leads_unlocked: number
          chantiers_completes: number
          chantiers_signes: number
          contributions_count: number
          contributions_qualified: number
          created_at: string
          filleuls_actifs: number
          stats_updated_at: string
          tier: string
          total_commission_due_cents: number
          total_commission_paid_cents: number
          total_referral_due_cents: number
          total_referral_paid_cents: number
          updated_at: string
        }
        Insert: {
          artisan_id: string
          bonus_leads_consumed?: number
          bonus_leads_unlocked?: number
          chantiers_completes?: number
          chantiers_signes?: number
          contributions_count?: number
          contributions_qualified?: number
          created_at?: string
          filleuls_actifs?: number
          stats_updated_at?: string
          tier?: string
          total_commission_due_cents?: number
          total_commission_paid_cents?: number
          total_referral_due_cents?: number
          total_referral_paid_cents?: number
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          bonus_leads_consumed?: number
          bonus_leads_unlocked?: number
          chantiers_completes?: number
          chantiers_signes?: number
          contributions_count?: number
          contributions_qualified?: number
          created_at?: string
          filleuls_actifs?: number
          stats_updated_at?: string
          tier?: string
          total_commission_due_cents?: number
          total_commission_paid_cents?: number
          total_referral_due_cents?: number
          total_referral_paid_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_progression_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: true
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_artisan_referral_commissions: {
        Row: {
          cancelled_reason: string | null
          commission_amount_cents: number
          created_at: string
          filleul_artisan_id: string
          id: string
          paid_at: string | null
          parrain_artisan_id: string
          partner_contract_id: string | null
          status: string
          updated_at: string
          validated_at: string | null
        }
        Insert: {
          cancelled_reason?: string | null
          commission_amount_cents?: number
          created_at?: string
          filleul_artisan_id: string
          id?: string
          paid_at?: string | null
          parrain_artisan_id: string
          partner_contract_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Update: {
          cancelled_reason?: string | null
          commission_amount_cents?: number
          created_at?: string
          filleul_artisan_id?: string
          id?: string
          paid_at?: string | null
          parrain_artisan_id?: string
          partner_contract_id?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_referral_commissions_filleul_artisan_id_fkey"
            columns: ["filleul_artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_referral_commissions_parrain_artisan_id_fkey"
            columns: ["parrain_artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_referral_commissions_partner_contract_id_fkey"
            columns: ["partner_contract_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_artisan_simulations: {
        Row: {
          artisan_id: string
          contribution_id: string | null
          created_at: string
          created_by: string | null
          id: string
          inputs: Json
          label: string | null
          result: Json | null
          source: string | null
          updated_at: string
        }
        Insert: {
          artisan_id: string
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs: Json
          label?: string | null
          result?: Json | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          artisan_id?: string
          contribution_id?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          inputs?: Json
          label?: string | null
          result?: Json | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_simulations_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_simulations_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "brh_artisan_contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_simulations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_artisan_social_posts: {
        Row: {
          artisan_id: string
          comment: string | null
          created_at: string
          id: string
          platform: string
          post_url: string
          refused_reason: string | null
          reward_leads: number
          screenshot_url: string | null
          status: string
          submitted_by: string | null
          updated_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          artisan_id: string
          comment?: string | null
          created_at?: string
          id?: string
          platform: string
          post_url: string
          refused_reason?: string | null
          reward_leads?: number
          screenshot_url?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          artisan_id?: string
          comment?: string | null
          created_at?: string
          id?: string
          platform?: string
          post_url?: string
          refused_reason?: string | null
          reward_leads?: number
          screenshot_url?: string | null
          status?: string
          submitted_by?: string | null
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_artisan_social_posts_artisan_id_fkey"
            columns: ["artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_social_posts_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_artisan_social_posts_validated_by_fkey"
            columns: ["validated_by"]
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
          custom_quota: number | null
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
          quota_period: string
          referred_by_artisan_id: string | null
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
          custom_quota?: number | null
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
          quota_period?: string
          referred_by_artisan_id?: string | null
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
          custom_quota?: number | null
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
          quota_period?: string
          referred_by_artisan_id?: string | null
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
          {
            foreignKeyName: "brh_artisans_rge_referred_by_artisan_id_fkey"
            columns: ["referred_by_artisan_id"]
            isOneToOne: false
            referencedRelation: "brh_artisans_rge"
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
      brh_autaf_link: {
        Row: {
          autaf_user_id: string
          autaf_username: string | null
          created_at: string
          id: string
          is_active: boolean
          last_error: string | null
          last_sync_at: string | null
          oauth_access_token_encrypted: string
          oauth_expires_at: string | null
          oauth_refresh_token_encrypted: string | null
          pro_id: string | null
          profile_id: string
          scopes: string[]
          updated_at: string
        }
        Insert: {
          autaf_user_id: string
          autaf_username?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          oauth_access_token_encrypted: string
          oauth_expires_at?: string | null
          oauth_refresh_token_encrypted?: string | null
          pro_id?: string | null
          profile_id: string
          scopes?: string[]
          updated_at?: string
        }
        Update: {
          autaf_user_id?: string
          autaf_username?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_error?: string | null
          last_sync_at?: string | null
          oauth_access_token_encrypted?: string
          oauth_expires_at?: string | null
          oauth_refresh_token_encrypted?: string | null
          pro_id?: string | null
          profile_id?: string
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_autaf_link_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_autaf_link_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      brh_bodacc_alerts: {
        Row: {
          adresse_complete: string | null
          bodacc_url: string | null
          code_insee_commune: string | null
          code_postal: string | null
          commune: string | null
          created_at: string
          date_cession: string | null
          date_parution: string | null
          date_publication: string
          denomination: string | null
          departement: string | null
          famille_avis: string
          fetched_at: string
          forme_juridique: string | null
          id_bodacc: string
          lat: number | null
          lng: number | null
          numero_parution: string | null
          prix_cession_cents: number | null
          raw_record: Json | null
          siren: string | null
          type_avis: string | null
        }
        Insert: {
          adresse_complete?: string | null
          bodacc_url?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_cession?: string | null
          date_parution?: string | null
          date_publication: string
          denomination?: string | null
          departement?: string | null
          famille_avis: string
          fetched_at?: string
          forme_juridique?: string | null
          id_bodacc: string
          lat?: number | null
          lng?: number | null
          numero_parution?: string | null
          prix_cession_cents?: number | null
          raw_record?: Json | null
          siren?: string | null
          type_avis?: string | null
        }
        Update: {
          adresse_complete?: string | null
          bodacc_url?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_cession?: string | null
          date_parution?: string | null
          date_publication?: string
          denomination?: string | null
          departement?: string | null
          famille_avis?: string
          fetched_at?: string
          forme_juridique?: string | null
          id_bodacc?: string
          lat?: number | null
          lng?: number | null
          numero_parution?: string | null
          prix_cession_cents?: number | null
          raw_record?: Json | null
          siren?: string | null
          type_avis?: string | null
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
      brh_chantier_applications: {
        Row: {
          applicant_pro_id: string
          commission_amount_cents: number | null
          commission_paid_at: string | null
          commission_pct_snapshot: number | null
          commission_status: string | null
          created_at: string
          devis_amount_cents: number | null
          devis_url: string | null
          id: string
          message: string | null
          message_thread_id: string | null
          offer_id: string
          quote_id: string | null
          rejected_at: string | null
          selected_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          applicant_pro_id: string
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          commission_pct_snapshot?: number | null
          commission_status?: string | null
          created_at?: string
          devis_amount_cents?: number | null
          devis_url?: string | null
          id?: string
          message?: string | null
          message_thread_id?: string | null
          offer_id: string
          quote_id?: string | null
          rejected_at?: string | null
          selected_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          applicant_pro_id?: string
          commission_amount_cents?: number | null
          commission_paid_at?: string | null
          commission_pct_snapshot?: number | null
          commission_status?: string | null
          created_at?: string
          devis_amount_cents?: number | null
          devis_url?: string | null
          id?: string
          message?: string | null
          message_thread_id?: string | null
          offer_id?: string
          quote_id?: string | null
          rejected_at?: string | null
          selected_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_chantier_applications_applicant_pro_id_fkey"
            columns: ["applicant_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_chantier_applications_message_thread_id_fkey"
            columns: ["message_thread_id"]
            isOneToOne: false
            referencedRelation: "brh_message_threads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_chantier_applications_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "brh_chantier_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_chantier_applications_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "brh_quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_chantier_offers: {
        Row: {
          adresse: string | null
          budget_cents: number | null
          budget_visible: boolean
          cancelled_reason: string | null
          closed_at: string | null
          code_postal: string | null
          commission_offer_pct: number
          commune: string | null
          contract_mode: string
          created_at: string
          departement: string | null
          description: string | null
          duration_weeks: number | null
          expires_at: string | null
          id: string
          lat: number | null
          lng: number | null
          metiers_recherches: string[]
          publisher_pro_id: string
          related_prospect_id: string | null
          start_date: string | null
          status: string
          tenant_id: string
          title: string
          updated_at: string
          visibility: string
        }
        Insert: {
          adresse?: string | null
          budget_cents?: number | null
          budget_visible?: boolean
          cancelled_reason?: string | null
          closed_at?: string | null
          code_postal?: string | null
          commission_offer_pct?: number
          commune?: string | null
          contract_mode?: string
          created_at?: string
          departement?: string | null
          description?: string | null
          duration_weeks?: number | null
          expires_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          metiers_recherches?: string[]
          publisher_pro_id: string
          related_prospect_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          title: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          adresse?: string | null
          budget_cents?: number | null
          budget_visible?: boolean
          cancelled_reason?: string | null
          closed_at?: string | null
          code_postal?: string | null
          commission_offer_pct?: number
          commune?: string | null
          contract_mode?: string
          created_at?: string
          departement?: string | null
          description?: string | null
          duration_weeks?: number | null
          expires_at?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          metiers_recherches?: string[]
          publisher_pro_id?: string
          related_prospect_id?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string
          title?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_chantier_offers_publisher_pro_id_fkey"
            columns: ["publisher_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_chantier_offers_related_prospect_id_fkey"
            columns: ["related_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
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
      brh_communes_sociodemo: {
        Row: {
          code_epci: string | null
          code_insee: string
          code_postal: string | null
          couleur_politique: string | null
          created_at: string
          decile_revenu_median: number | null
          departement: string | null
          elections_resultats: Json | null
          elus_municipaux: Json | null
          fetched_at: string
          filosofi_source_year: number | null
          gentrification_label: string | null
          gentrification_score: number | null
          loyer_appartement_eur_cents: number | null
          loyer_maison_eur_cents: number | null
          loyer_source_year: number | null
          loyer_t1_t2_eur_cents: number | null
          loyer_t3_plus_eur_cents: number | null
          maire_nom: string | null
          maire_parti: string | null
          maire_prenom: string | null
          nom_commune: string
          pct_csp_cadres: number | null
          pct_csp_employes: number | null
          pct_csp_ouvriers: number | null
          pct_logements_avant_1975: number | null
          pct_proprietaires: number | null
          pct_residences_secondaires: number | null
          population: number | null
          raw_sources: Json | null
          recensement_source_year: number | null
          revenu_median_disponible_eur_cents: number | null
          taux_pauvrete_pct: number | null
          ttl_seconds: number
          updated_at: string
        }
        Insert: {
          code_epci?: string | null
          code_insee: string
          code_postal?: string | null
          couleur_politique?: string | null
          created_at?: string
          decile_revenu_median?: number | null
          departement?: string | null
          elections_resultats?: Json | null
          elus_municipaux?: Json | null
          fetched_at?: string
          filosofi_source_year?: number | null
          gentrification_label?: string | null
          gentrification_score?: number | null
          loyer_appartement_eur_cents?: number | null
          loyer_maison_eur_cents?: number | null
          loyer_source_year?: number | null
          loyer_t1_t2_eur_cents?: number | null
          loyer_t3_plus_eur_cents?: number | null
          maire_nom?: string | null
          maire_parti?: string | null
          maire_prenom?: string | null
          nom_commune: string
          pct_csp_cadres?: number | null
          pct_csp_employes?: number | null
          pct_csp_ouvriers?: number | null
          pct_logements_avant_1975?: number | null
          pct_proprietaires?: number | null
          pct_residences_secondaires?: number | null
          population?: number | null
          raw_sources?: Json | null
          recensement_source_year?: number | null
          revenu_median_disponible_eur_cents?: number | null
          taux_pauvrete_pct?: number | null
          ttl_seconds?: number
          updated_at?: string
        }
        Update: {
          code_epci?: string | null
          code_insee?: string
          code_postal?: string | null
          couleur_politique?: string | null
          created_at?: string
          decile_revenu_median?: number | null
          departement?: string | null
          elections_resultats?: Json | null
          elus_municipaux?: Json | null
          fetched_at?: string
          filosofi_source_year?: number | null
          gentrification_label?: string | null
          gentrification_score?: number | null
          loyer_appartement_eur_cents?: number | null
          loyer_maison_eur_cents?: number | null
          loyer_source_year?: number | null
          loyer_t1_t2_eur_cents?: number | null
          loyer_t3_plus_eur_cents?: number | null
          maire_nom?: string | null
          maire_parti?: string | null
          maire_prenom?: string | null
          nom_commune?: string
          pct_csp_cadres?: number | null
          pct_csp_employes?: number | null
          pct_csp_ouvriers?: number | null
          pct_logements_avant_1975?: number | null
          pct_proprietaires?: number | null
          pct_residences_secondaires?: number | null
          population?: number | null
          raw_sources?: Json | null
          recensement_source_year?: number | null
          revenu_median_disponible_eur_cents?: number | null
          taux_pauvrete_pct?: number | null
          ttl_seconds?: number
          updated_at?: string
        }
        Relationships: []
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
          is_public_partner: boolean
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
          is_public_partner?: boolean
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
          is_public_partner?: boolean
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
          referred_by_agence_id: string | null
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
          referred_by_agence_id?: string | null
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
          referred_by_agence_id?: string | null
          status?: string | null
          sujet?: string | null
          telephone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_contacts_referred_by_agence_id_fkey"
            columns: ["referred_by_agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
        ]
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
      brh_dedup_archive: {
        Row: {
          adresse: string | null
          archive_reason: string | null
          archived_at: string | null
          ca_total_eur: number | null
          categorie: string | null
          code_postal: string | null
          contact_disponibilite: string | null
          created_at: string | null
          derniere_facture: string | null
          derniere_visite_terrain: string | null
          dpe_terrain_estime: string | null
          email: string | null
          employee_notes: string | null
          employee_updated_at: string | null
          employee_updated_by: string | null
          enfants: string | null
          enrichment_score: number | null
          enrichment_tier: string | null
          fingerprint_hash: string | null
          full_name: string | null
          id: string | null
          interet_brh: string | null
          is_pro: boolean | null
          link_confidence: number | null
          linked_dpe_id: number | null
          nb_rdv: number | null
          nom: string | null
          osint_facebook: string | null
          osint_ghunt: Json | null
          osint_linkedin: string | null
          osint_other: Json | null
          osint_pappers: Json | null
          osint_sherlock: Json | null
          premiere_facture: string | null
          prenom: string | null
          psy_profile: Json | null
          societe: string | null
          source_primaire: string | null
          sources_secondaires: string[] | null
          statut: string | null
          telephone: string | null
          telephone_secondaire: string | null
          travaux_terrain_status: string | null
          updated_at: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          ca_total_eur?: number | null
          categorie?: string | null
          code_postal?: string | null
          contact_disponibilite?: string | null
          created_at?: string | null
          derniere_facture?: string | null
          derniere_visite_terrain?: string | null
          dpe_terrain_estime?: string | null
          email?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          enfants?: string | null
          enrichment_score?: number | null
          enrichment_tier?: string | null
          fingerprint_hash?: string | null
          full_name?: string | null
          id?: string | null
          interet_brh?: string | null
          is_pro?: boolean | null
          link_confidence?: number | null
          linked_dpe_id?: number | null
          nb_rdv?: number | null
          nom?: string | null
          osint_facebook?: string | null
          osint_ghunt?: Json | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_pappers?: Json | null
          osint_sherlock?: Json | null
          premiere_facture?: string | null
          prenom?: string | null
          psy_profile?: Json | null
          societe?: string | null
          source_primaire?: string | null
          sources_secondaires?: string[] | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          travaux_terrain_status?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          archive_reason?: string | null
          archived_at?: string | null
          ca_total_eur?: number | null
          categorie?: string | null
          code_postal?: string | null
          contact_disponibilite?: string | null
          created_at?: string | null
          derniere_facture?: string | null
          derniere_visite_terrain?: string | null
          dpe_terrain_estime?: string | null
          email?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          enfants?: string | null
          enrichment_score?: number | null
          enrichment_tier?: string | null
          fingerprint_hash?: string | null
          full_name?: string | null
          id?: string | null
          interet_brh?: string | null
          is_pro?: boolean | null
          link_confidence?: number | null
          linked_dpe_id?: number | null
          nb_rdv?: number | null
          nom?: string | null
          osint_facebook?: string | null
          osint_ghunt?: Json | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_pappers?: Json | null
          osint_sherlock?: Json | null
          premiere_facture?: string | null
          prenom?: string | null
          psy_profile?: Json | null
          societe?: string | null
          source_primaire?: string | null
          sources_secondaires?: string[] | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          travaux_terrain_status?: string | null
          updated_at?: string | null
          ville?: string | null
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
      brh_dirigeant_sci: {
        Row: {
          created_at: string
          date_creation: string | null
          denomination: string | null
          departement: string | null
          dirigeant_id: string
          forme_juridique: string | null
          is_active: boolean
          qualite: string | null
          siren: string
        }
        Insert: {
          created_at?: string
          date_creation?: string | null
          denomination?: string | null
          departement?: string | null
          dirigeant_id: string
          forme_juridique?: string | null
          is_active?: boolean
          qualite?: string | null
          siren: string
        }
        Update: {
          created_at?: string
          date_creation?: string | null
          denomination?: string | null
          departement?: string | null
          dirigeant_id?: string
          forme_juridique?: string | null
          is_active?: boolean
          qualite?: string | null
          siren?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_dirigeant_sci_dirigeant_id_fkey"
            columns: ["dirigeant_id"]
            isOneToOne: false
            referencedRelation: "brh_dirigeants"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_dirigeants: {
        Row: {
          autres_entreprises: Json | null
          autres_entreprises_enriched_at: string | null
          autres_entreprises_match_count: number | null
          created_at: string
          date_naissance: string | null
          deces_commune: string | null
          deces_date: string | null
          derniere_visite_terrain: string | null
          email_pro_via_entreprise: string | null
          employee_notes: string | null
          employee_updated_at: string | null
          employee_updated_by: string | null
          est_decede: boolean | null
          id: string
          interet_brh: string | null
          nb_dpe_total: number | null
          nb_sci_actives: number | null
          nb_sci_dirigees: number | null
          nom: string
          nom_norm: string | null
          osint_adresse_perso: string | null
          osint_email: string | null
          osint_linkedin: string | null
          osint_other: Json | null
          osint_telephone: string | null
          prenom: string
          prenom_norm: string | null
          psy_profile: Json | null
          psy_profile_generated_at: string | null
          sci_dirigees: Json | null
          succession_potentielle: boolean | null
          tel_pro_via_entreprise: string | null
          updated_at: string
        }
        Insert: {
          autres_entreprises?: Json | null
          autres_entreprises_enriched_at?: string | null
          autres_entreprises_match_count?: number | null
          created_at?: string
          date_naissance?: string | null
          deces_commune?: string | null
          deces_date?: string | null
          derniere_visite_terrain?: string | null
          email_pro_via_entreprise?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          est_decede?: boolean | null
          id?: string
          interet_brh?: string | null
          nb_dpe_total?: number | null
          nb_sci_actives?: number | null
          nb_sci_dirigees?: number | null
          nom: string
          nom_norm?: string | null
          osint_adresse_perso?: string | null
          osint_email?: string | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_telephone?: string | null
          prenom: string
          prenom_norm?: string | null
          psy_profile?: Json | null
          psy_profile_generated_at?: string | null
          sci_dirigees?: Json | null
          succession_potentielle?: boolean | null
          tel_pro_via_entreprise?: string | null
          updated_at?: string
        }
        Update: {
          autres_entreprises?: Json | null
          autres_entreprises_enriched_at?: string | null
          autres_entreprises_match_count?: number | null
          created_at?: string
          date_naissance?: string | null
          deces_commune?: string | null
          deces_date?: string | null
          derniere_visite_terrain?: string | null
          email_pro_via_entreprise?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          est_decede?: boolean | null
          id?: string
          interet_brh?: string | null
          nb_dpe_total?: number | null
          nb_sci_actives?: number | null
          nb_sci_dirigees?: number | null
          nom?: string
          nom_norm?: string | null
          osint_adresse_perso?: string | null
          osint_email?: string | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_telephone?: string | null
          prenom?: string
          prenom_norm?: string | null
          psy_profile?: Json | null
          psy_profile_generated_at?: string | null
          sci_dirigees?: Json | null
          succession_potentielle?: boolean | null
          tel_pro_via_entreprise?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_dirigeants_employee_updated_by_fkey"
            columns: ["employee_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_disponibilites: {
        Row: {
          archived_at: string | null
          capacite_chantiers: number | null
          contract_mode_pref: string
          created_at: string
          departements: string[]
          description: string | null
          expires_at: string | null
          id: string
          metiers_proposes: string[]
          periode_debut: string
          periode_fin: string
          pro_id: string
          status: string
          tenant_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          capacite_chantiers?: number | null
          contract_mode_pref?: string
          created_at?: string
          departements?: string[]
          description?: string | null
          expires_at?: string | null
          id?: string
          metiers_proposes?: string[]
          periode_debut: string
          periode_fin: string
          pro_id: string
          status?: string
          tenant_id?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          capacite_chantiers?: number | null
          contract_mode_pref?: string
          created_at?: string
          departements?: string[]
          description?: string | null
          expires_at?: string | null
          id?: string
          metiers_proposes?: string[]
          periode_debut?: string
          periode_fin?: string
          pro_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_disponibilites_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
        ]
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
          adresse_ban_enriched_at: string | null
          adresse_ban_id: string | null
          adresse_ban_score: number | null
          adresse_norm: string | null
          aides_barem_date: string | null
          aides_detail: Json | null
          annee_construction: number | null
          brh_prospect_id: string | null
          cee_total: number | null
          chiffrage_date: string | null
          chiffrage_detail: Json | null
          chiffrage_total_ht: number | null
          chiffrage_total_ttc: number | null
          code_insee: string | null
          code_postal: string | null
          commune: string | null
          conso_m2_ep: number | null
          contact_disponibilite: string | null
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
          derniere_visite_terrain: string | null
          description_chauffage: string | null
          description_ecs: string | null
          dpe_saut_confidence: string | null
          dpe_saut_s1: Json | null
          dpe_saut_s2: Json | null
          dpe_saut_s3: Json | null
          dpe_terrain_estime: string | null
          dvf_date: string | null
          dvf_distance_m: number | null
          dvf_mutation_24m: boolean
          dvf_nature: string | null
          dvf_prix: number | null
          dvf_prix_m2: number | null
          dvf_surface: number | null
          dvf_type: string | null
          employee_notes: string | null
          employee_overrides: Json
          employee_updated_at: string | null
          employee_updated_by: string | null
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
          interet_brh: string | null
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
          numero_norm: string | null
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
          score_v2_breakdown: Json | null
          score_v2_calculated_at: string | null
          score_v2_detail: Json | null
          score_v2_segment: string | null
          statut: string | null
          surface_habitable: number | null
          travaux_terrain_status: string | null
          type_batiment: string | null
          type_energie_chauffage: string | null
          type_energie_ecs: string | null
          type_ventilation: string | null
          ubat: number | null
          voie_norm: string | null
        }
        Insert: {
          abf_required?: boolean
          adresse?: string | null
          adresse_ban?: string | null
          adresse_ban_enriched_at?: string | null
          adresse_ban_id?: string | null
          adresse_ban_score?: number | null
          adresse_norm?: string | null
          aides_barem_date?: string | null
          aides_detail?: Json | null
          annee_construction?: number | null
          brh_prospect_id?: string | null
          cee_total?: number | null
          chiffrage_date?: string | null
          chiffrage_detail?: Json | null
          chiffrage_total_ht?: number | null
          chiffrage_total_ttc?: number | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          conso_m2_ep?: number | null
          contact_disponibilite?: string | null
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
          derniere_visite_terrain?: string | null
          description_chauffage?: string | null
          description_ecs?: string | null
          dpe_saut_confidence?: string | null
          dpe_saut_s1?: Json | null
          dpe_saut_s2?: Json | null
          dpe_saut_s3?: Json | null
          dpe_terrain_estime?: string | null
          dvf_date?: string | null
          dvf_distance_m?: number | null
          dvf_mutation_24m?: boolean
          dvf_nature?: string | null
          dvf_prix?: number | null
          dvf_prix_m2?: number | null
          dvf_surface?: number | null
          dvf_type?: string | null
          employee_notes?: string | null
          employee_overrides?: Json
          employee_updated_at?: string | null
          employee_updated_by?: string | null
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
          interet_brh?: string | null
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
          numero_norm?: string | null
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
          score_v2_breakdown?: Json | null
          score_v2_calculated_at?: string | null
          score_v2_detail?: Json | null
          score_v2_segment?: string | null
          statut?: string | null
          surface_habitable?: number | null
          travaux_terrain_status?: string | null
          type_batiment?: string | null
          type_energie_chauffage?: string | null
          type_energie_ecs?: string | null
          type_ventilation?: string | null
          ubat?: number | null
          voie_norm?: string | null
        }
        Update: {
          abf_required?: boolean
          adresse?: string | null
          adresse_ban?: string | null
          adresse_ban_enriched_at?: string | null
          adresse_ban_id?: string | null
          adresse_ban_score?: number | null
          adresse_norm?: string | null
          aides_barem_date?: string | null
          aides_detail?: Json | null
          annee_construction?: number | null
          brh_prospect_id?: string | null
          cee_total?: number | null
          chiffrage_date?: string | null
          chiffrage_detail?: Json | null
          chiffrage_total_ht?: number | null
          chiffrage_total_ttc?: number | null
          code_insee?: string | null
          code_postal?: string | null
          commune?: string | null
          conso_m2_ep?: number | null
          contact_disponibilite?: string | null
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
          derniere_visite_terrain?: string | null
          description_chauffage?: string | null
          description_ecs?: string | null
          dpe_saut_confidence?: string | null
          dpe_saut_s1?: Json | null
          dpe_saut_s2?: Json | null
          dpe_saut_s3?: Json | null
          dpe_terrain_estime?: string | null
          dvf_date?: string | null
          dvf_distance_m?: number | null
          dvf_mutation_24m?: boolean
          dvf_nature?: string | null
          dvf_prix?: number | null
          dvf_prix_m2?: number | null
          dvf_surface?: number | null
          dvf_type?: string | null
          employee_notes?: string | null
          employee_overrides?: Json
          employee_updated_at?: string | null
          employee_updated_by?: string | null
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
          interet_brh?: string | null
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
          numero_norm?: string | null
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
          score_v2_breakdown?: Json | null
          score_v2_calculated_at?: string | null
          score_v2_detail?: Json | null
          score_v2_segment?: string | null
          statut?: string | null
          surface_habitable?: number | null
          travaux_terrain_status?: string | null
          type_batiment?: string | null
          type_energie_chauffage?: string | null
          type_energie_ecs?: string | null
          type_ventilation?: string | null
          ubat?: number | null
          voie_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_dpe_prospects_brh_prospect_id_fkey"
            columns: ["brh_prospect_id"]
            isOneToOne: false
            referencedRelation: "brh_prospects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_dpe_prospects_employee_updated_by_fkey"
            columns: ["employee_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      brh_dvf_archive: {
        Row: {
          adresse_numero: string | null
          adresse_voie: string | null
          archive_batch_id: string | null
          archived_at: string
          code_insee_commune: string | null
          code_postal: string | null
          commune: string | null
          created_at: string
          date_mutation: string
          departement: string | null
          id: string
          id_mutation: string
          is_groupee: boolean | null
          lat: number | null
          lng: number | null
          nature_mutation: string
          nombre_pieces_principales: number | null
          parcelle_idu: string | null
          prix_m2_calc: number | null
          raw_record: Json | null
          source_year: number
          surface_reelle_bati: number | null
          surface_terrain: number | null
          type_local: string | null
          usable_for_brh: boolean | null
          valeur_fonciere_cents: number | null
        }
        Insert: {
          adresse_numero?: string | null
          adresse_voie?: string | null
          archive_batch_id?: string | null
          archived_at?: string
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_mutation: string
          departement?: string | null
          id?: string
          id_mutation: string
          is_groupee?: boolean | null
          lat?: number | null
          lng?: number | null
          nature_mutation: string
          nombre_pieces_principales?: number | null
          parcelle_idu?: string | null
          prix_m2_calc?: number | null
          raw_record?: Json | null
          source_year: number
          surface_reelle_bati?: number | null
          surface_terrain?: number | null
          type_local?: string | null
          usable_for_brh?: boolean | null
          valeur_fonciere_cents?: number | null
        }
        Update: {
          adresse_numero?: string | null
          adresse_voie?: string | null
          archive_batch_id?: string | null
          archived_at?: string
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_mutation?: string
          departement?: string | null
          id?: string
          id_mutation?: string
          is_groupee?: boolean | null
          lat?: number | null
          lng?: number | null
          nature_mutation?: string
          nombre_pieces_principales?: number | null
          parcelle_idu?: string | null
          prix_m2_calc?: number | null
          raw_record?: Json | null
          source_year?: number
          surface_reelle_bati?: number | null
          surface_terrain?: number | null
          type_local?: string | null
          usable_for_brh?: boolean | null
          valeur_fonciere_cents?: number | null
        }
        Relationships: []
      }
      brh_email_sends: {
        Row: {
          body_html: string
          bounced_at: string | null
          clicked_at: string | null
          employee_id: string
          id: string
          opened_at: string | null
          recipient_audience: string | null
          recipient_company: string | null
          recipient_email: string
          recipient_name: string | null
          replied_at: string | null
          resend_message_id: string | null
          sent_at: string
          status: string
          subject: string
          template_id: string | null
        }
        Insert: {
          body_html: string
          bounced_at?: string | null
          clicked_at?: string | null
          employee_id: string
          id?: string
          opened_at?: string | null
          recipient_audience?: string | null
          recipient_company?: string | null
          recipient_email: string
          recipient_name?: string | null
          replied_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject: string
          template_id?: string | null
        }
        Update: {
          body_html?: string
          bounced_at?: string | null
          clicked_at?: string | null
          employee_id?: string
          id?: string
          opened_at?: string | null
          recipient_audience?: string | null
          recipient_company?: string | null
          recipient_email?: string
          recipient_name?: string | null
          replied_at?: string | null
          resend_message_id?: string | null
          sent_at?: string
          status?: string
          subject?: string
          template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_email_sends_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "brh_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_email_sends_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "brh_email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_email_templates: {
        Row: {
          body_html: string
          created_at: string
          id: string
          is_active: boolean
          slug: string
          subject: string
          target_audience: string
          updated_at: string
          variables: Json
        }
        Insert: {
          body_html: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug: string
          subject: string
          target_audience: string
          updated_at?: string
          variables?: Json
        }
        Update: {
          body_html?: string
          created_at?: string
          id?: string
          is_active?: boolean
          slug?: string
          subject?: string
          target_audience?: string
          updated_at?: string
          variables?: Json
        }
        Relationships: []
      }
      brh_employee_actions: {
        Row: {
          action_type: string
          created_at: string
          employee_id: string
          id: string
          metadata: Json | null
          notes: string | null
          points: number
          related_entity_id: string | null
          related_entity_type: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          employee_id: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          points: number
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          employee_id?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          points?: number
          related_entity_id?: string | null
          related_entity_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_employee_actions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "brh_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_employee_calendar: {
        Row: {
          created_at: string
          day_of_week: number
          employee_id: string
          id: string
          period: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          employee_id: string
          id?: string
          period: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          employee_id?: string
          id?: string
          period?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_employee_calendar_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "brh_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_employee_edit_log: {
        Row: {
          edited_at: string
          employee_id: string | null
          entity_id: string
          entity_type: string
          field_changed: string
          id: string
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          edited_at?: string
          employee_id?: string | null
          entity_id: string
          entity_type: string
          field_changed: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          edited_at?: string
          employee_id?: string | null
          entity_id?: string
          entity_type?: string
          field_changed?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_employee_edit_log_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_employees: {
        Row: {
          activity_level: string
          activity_score: number
          created_at: string
          custom_quota: number | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          leads_received_this_month: number
          profile_id: string
          quota_period: string
          role_label: string
          signature_html: string | null
          updated_at: string
        }
        Insert: {
          activity_level?: string
          activity_score?: number
          created_at?: string
          custom_quota?: number | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean
          leads_received_this_month?: number
          profile_id: string
          quota_period?: string
          role_label?: string
          signature_html?: string | null
          updated_at?: string
        }
        Update: {
          activity_level?: string
          activity_score?: number
          created_at?: string
          custom_quota?: number | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          leads_received_this_month?: number
          profile_id?: string
          quota_period?: string
          role_label?: string
          signature_html?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_employees_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_entity_links: {
        Row: {
          computed_at: string
          computed_by: string
          confidence: number
          evidence: Json | null
          from_id: string
          from_type: string
          id: string
          link_type: string
          to_id: string
          to_type: string
        }
        Insert: {
          computed_at?: string
          computed_by?: string
          confidence?: number
          evidence?: Json | null
          from_id: string
          from_type: string
          id?: string
          link_type: string
          to_id: string
          to_type: string
        }
        Update: {
          computed_at?: string
          computed_by?: string
          confidence?: number
          evidence?: Json | null
          from_id?: string
          from_type?: string
          id?: string
          link_type?: string
          to_id?: string
          to_type?: string
        }
        Relationships: []
      }
      brh_entity_links_archive: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          computed_at: string | null
          computed_by: string | null
          confidence: number | null
          evidence: Json | null
          from_id: string | null
          from_type: string | null
          id: string | null
          link_type: string | null
          to_id: string | null
          to_type: string | null
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          computed_at?: string | null
          computed_by?: string | null
          confidence?: number | null
          evidence?: Json | null
          from_id?: string | null
          from_type?: string | null
          id?: string | null
          link_type?: string | null
          to_id?: string | null
          to_type?: string | null
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          computed_at?: string | null
          computed_by?: string | null
          confidence?: number | null
          evidence?: Json | null
          from_id?: string | null
          from_type?: string | null
          id?: string | null
          link_type?: string | null
          to_id?: string | null
          to_type?: string | null
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
      brh_ext_bdnb_batiments: {
        Row: {
          annee_construction: number | null
          ban_id: string
          batiment_groupe_id: string
          dept: string
          ingested_at: string
          mat_mur_txt: string | null
          mat_toit_txt: string | null
          nb_log: number | null
          nb_niveau: number | null
          surface_habitable_logement: number | null
          type_vitrage: string | null
        }
        Insert: {
          annee_construction?: number | null
          ban_id: string
          batiment_groupe_id: string
          dept: string
          ingested_at?: string
          mat_mur_txt?: string | null
          mat_toit_txt?: string | null
          nb_log?: number | null
          nb_niveau?: number | null
          surface_habitable_logement?: number | null
          type_vitrage?: string | null
        }
        Update: {
          annee_construction?: number | null
          ban_id?: string
          batiment_groupe_id?: string
          dept?: string
          ingested_at?: string
          mat_mur_txt?: string | null
          mat_toit_txt?: string | null
          nb_log?: number | null
          nb_niveau?: number | null
          surface_habitable_logement?: number | null
          type_vitrage?: string | null
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
          abf_ac1_count: number | null
          audits_ademe_count: number | null
          basias_count: number | null
          basol_count: number | null
          catnat_inondation: number | null
          catnat_last_date: string | null
          catnat_secheresse: number | null
          catnat_tempete: number | null
          catnat_total: number | null
          delta_dju_2050: number | null
          dju_18_normal: number | null
          dpe_tertiaire_count: number | null
          dvf_last_refresh: string | null
          evolution_pop_16_22: number | null
          fetched_at: string
          icpe_count: number | null
          insee: string
          lignes_ht_count: number | null
          lovac_pp_total_2024: number | null
          lovac_pp_vacant_2024: number | null
          lovac_pp_vacant_2ans_2024: number | null
          lovac_tx_vacance: number | null
          lovac_tx_vacance_long: number | null
          merimee_classe: number | null
          merimee_count: number | null
          merimee_inscrit: number | null
          natura2000_sample: string | null
          natura2000_sic_count: number | null
          natura2000_zps_count: number | null
          nb_dp_logements_existants_12m: number | null
          nb_rge_isolation: number | null
          nb_rge_pac: number | null
          opah_active: boolean
          opah_fin_validite: string | null
          opah_operateur: string | null
          opah_type: string | null
          population_2008: number | null
          population_2016: number | null
          population_2022: number | null
          ppri_present: boolean
          prix_m2_growth_3y: number | null
          prix_m2_median_3y: number | null
          radon_categorie: number | null
          rga_alea: string | null
          rnb_batiments_count: number | null
          sismique_zone: number | null
          sitadel2_last_refresh: string | null
          sru_assujettie: boolean | null
          sru_carencee: boolean | null
          sru_deficitaire: boolean | null
          sru_taux_lls: number | null
          station_dju_id: string | null
          taux_teom: number | null
          taux_tfb: number | null
          taux_tfnb: number | null
          taux_th: number | null
          tlv_tendue: boolean | null
          tlv_zonage: string | null
          tracc_climat: Json | null
          tx_vacance_struct: number | null
          znieff_sample: string | null
          znieff1_count: number | null
          znieff2_count: number | null
        }
        Insert: {
          abf_ac1_count?: number | null
          audits_ademe_count?: number | null
          basias_count?: number | null
          basol_count?: number | null
          catnat_inondation?: number | null
          catnat_last_date?: string | null
          catnat_secheresse?: number | null
          catnat_tempete?: number | null
          catnat_total?: number | null
          delta_dju_2050?: number | null
          dju_18_normal?: number | null
          dpe_tertiaire_count?: number | null
          dvf_last_refresh?: string | null
          evolution_pop_16_22?: number | null
          fetched_at?: string
          icpe_count?: number | null
          insee: string
          lignes_ht_count?: number | null
          lovac_pp_total_2024?: number | null
          lovac_pp_vacant_2024?: number | null
          lovac_pp_vacant_2ans_2024?: number | null
          lovac_tx_vacance?: number | null
          lovac_tx_vacance_long?: number | null
          merimee_classe?: number | null
          merimee_count?: number | null
          merimee_inscrit?: number | null
          natura2000_sample?: string | null
          natura2000_sic_count?: number | null
          natura2000_zps_count?: number | null
          nb_dp_logements_existants_12m?: number | null
          nb_rge_isolation?: number | null
          nb_rge_pac?: number | null
          opah_active?: boolean
          opah_fin_validite?: string | null
          opah_operateur?: string | null
          opah_type?: string | null
          population_2008?: number | null
          population_2016?: number | null
          population_2022?: number | null
          ppri_present?: boolean
          prix_m2_growth_3y?: number | null
          prix_m2_median_3y?: number | null
          radon_categorie?: number | null
          rga_alea?: string | null
          rnb_batiments_count?: number | null
          sismique_zone?: number | null
          sitadel2_last_refresh?: string | null
          sru_assujettie?: boolean | null
          sru_carencee?: boolean | null
          sru_deficitaire?: boolean | null
          sru_taux_lls?: number | null
          station_dju_id?: string | null
          taux_teom?: number | null
          taux_tfb?: number | null
          taux_tfnb?: number | null
          taux_th?: number | null
          tlv_tendue?: boolean | null
          tlv_zonage?: string | null
          tracc_climat?: Json | null
          tx_vacance_struct?: number | null
          znieff_sample?: string | null
          znieff1_count?: number | null
          znieff2_count?: number | null
        }
        Update: {
          abf_ac1_count?: number | null
          audits_ademe_count?: number | null
          basias_count?: number | null
          basol_count?: number | null
          catnat_inondation?: number | null
          catnat_last_date?: string | null
          catnat_secheresse?: number | null
          catnat_tempete?: number | null
          catnat_total?: number | null
          delta_dju_2050?: number | null
          dju_18_normal?: number | null
          dpe_tertiaire_count?: number | null
          dvf_last_refresh?: string | null
          evolution_pop_16_22?: number | null
          fetched_at?: string
          icpe_count?: number | null
          insee?: string
          lignes_ht_count?: number | null
          lovac_pp_total_2024?: number | null
          lovac_pp_vacant_2024?: number | null
          lovac_pp_vacant_2ans_2024?: number | null
          lovac_tx_vacance?: number | null
          lovac_tx_vacance_long?: number | null
          merimee_classe?: number | null
          merimee_count?: number | null
          merimee_inscrit?: number | null
          natura2000_sample?: string | null
          natura2000_sic_count?: number | null
          natura2000_zps_count?: number | null
          nb_dp_logements_existants_12m?: number | null
          nb_rge_isolation?: number | null
          nb_rge_pac?: number | null
          opah_active?: boolean
          opah_fin_validite?: string | null
          opah_operateur?: string | null
          opah_type?: string | null
          population_2008?: number | null
          population_2016?: number | null
          population_2022?: number | null
          ppri_present?: boolean
          prix_m2_growth_3y?: number | null
          prix_m2_median_3y?: number | null
          radon_categorie?: number | null
          rga_alea?: string | null
          rnb_batiments_count?: number | null
          sismique_zone?: number | null
          sitadel2_last_refresh?: string | null
          sru_assujettie?: boolean | null
          sru_carencee?: boolean | null
          sru_deficitaire?: boolean | null
          sru_taux_lls?: number | null
          station_dju_id?: string | null
          taux_teom?: number | null
          taux_tfb?: number | null
          taux_tfnb?: number | null
          taux_th?: number | null
          tlv_tendue?: boolean | null
          tlv_zonage?: string | null
          tracc_climat?: Json | null
          tx_vacance_struct?: number | null
          znieff_sample?: string | null
          znieff1_count?: number | null
          znieff2_count?: number | null
        }
        Relationships: []
      }
      brh_ext_dgfip_centres: {
        Row: {
          adresse: string | null
          code_postal: string | null
          commune: string | null
          created_at: string | null
          departement: string | null
          id: string
          lat: number | null
          lng: number | null
          nom: string
          telephone: string | null
          type_centre: string
          updated_at: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string | null
          departement?: string | null
          id: string
          lat?: number | null
          lng?: number | null
          nom: string
          telephone?: string | null
          type_centre: string
          updated_at?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string | null
          departement?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          nom?: string
          telephone?: string | null
          type_centre?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      brh_ext_immo_companies: {
        Row: {
          activite_principale: string | null
          code_insee_commune: string | null
          code_postal: string | null
          commune: string | null
          date_creation: string | null
          departement: string | null
          fetched_at: string
          forme_juridique: string | null
          lat: number | null
          lng: number | null
          nom_complet: string | null
          raw_data: Json | null
          siren: string
          siret_siege: string | null
          tranche_effectifs: number | null
          type_immo: string | null
        }
        Insert: {
          activite_principale?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          date_creation?: string | null
          departement?: string | null
          fetched_at?: string
          forme_juridique?: string | null
          lat?: number | null
          lng?: number | null
          nom_complet?: string | null
          raw_data?: Json | null
          siren: string
          siret_siege?: string | null
          tranche_effectifs?: number | null
          type_immo?: string | null
        }
        Update: {
          activite_principale?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          date_creation?: string | null
          departement?: string | null
          fetched_at?: string
          forme_juridique?: string | null
          lat?: number | null
          lng?: number | null
          nom_complet?: string | null
          raw_data?: Json | null
          siren?: string
          siret_siege?: string | null
          tranche_effectifs?: number | null
          type_immo?: string | null
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
          p21_log: number | null
          p21_rp: number | null
          pdl_gaz_resid: number | null
          reco_fetched_at: string | null
          thermosens_kwh_dj: number | null
          tx_avant_1975: number | null
          tx_maison: number | null
          tx_proprio: number | null
          tx_vacance_log: number | null
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
          p21_log?: number | null
          p21_rp?: number | null
          pdl_gaz_resid?: number | null
          reco_fetched_at?: string | null
          thermosens_kwh_dj?: number | null
          tx_avant_1975?: number | null
          tx_maison?: number | null
          tx_proprio?: number | null
          tx_vacance_log?: number | null
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
          p21_log?: number | null
          p21_rp?: number | null
          pdl_gaz_resid?: number | null
          reco_fetched_at?: string | null
          thermosens_kwh_dj?: number | null
          tx_avant_1975?: number | null
          tx_maison?: number | null
          tx_proprio?: number | null
          tx_vacance_log?: number | null
        }
        Relationships: []
      }
      brh_ext_outils_communaux: {
        Row: {
          code_epci: string | null
          code_insee: string | null
          description: string | null
          fetched_at: string
          id: string
          nom_collectivite: string
          source: string | null
          type_outil: string
          url: string
        }
        Insert: {
          code_epci?: string | null
          code_insee?: string | null
          description?: string | null
          fetched_at?: string
          id?: string
          nom_collectivite: string
          source?: string | null
          type_outil: string
          url: string
        }
        Update: {
          code_epci?: string | null
          code_insee?: string | null
          description?: string | null
          fetched_at?: string
          id?: string
          nom_collectivite?: string
          source?: string | null
          type_outil?: string
          url?: string
        }
        Relationships: []
      }
      brh_ext_rge_companies: {
        Row: {
          adresse: string | null
          code_insee_commune: string | null
          code_postal: string | null
          code_qualification: string | null
          commune: string | null
          created_at: string
          departement: string | null
          domaine: string | null
          email: string | null
          fetched_at: string
          id: string
          lat: number | null
          lng: number | null
          nom_certificat: string | null
          nom_entreprise: string
          nom_qualification: string | null
          siret: string
          site_internet: string | null
          source_data: string
          telephone: string | null
          url_qualification: string | null
        }
        Insert: {
          adresse?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          code_qualification?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          domaine?: string | null
          email?: string | null
          fetched_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nom_certificat?: string | null
          nom_entreprise: string
          nom_qualification?: string | null
          siret: string
          site_internet?: string | null
          source_data?: string
          telephone?: string | null
          url_qualification?: string | null
        }
        Update: {
          adresse?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          code_qualification?: string | null
          commune?: string | null
          created_at?: string
          departement?: string | null
          domaine?: string | null
          email?: string | null
          fetched_at?: string
          id?: string
          lat?: number | null
          lng?: number | null
          nom_certificat?: string | null
          nom_entreprise?: string
          nom_qualification?: string | null
          siret?: string
          site_internet?: string | null
          source_data?: string
          telephone?: string | null
          url_qualification?: string | null
        }
        Relationships: []
      }
      brh_favoris: {
        Row: {
          agence_id: string | null
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          label: string
          notes: string | null
          priority: string
          profile_id: string
          status: string
          sublabel: string | null
          tags: string[]
          updated_at: string
        }
        Insert: {
          agence_id?: string | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          label: string
          notes?: string | null
          priority?: string
          profile_id: string
          status?: string
          sublabel?: string | null
          tags?: string[]
          updated_at?: string
        }
        Update: {
          agence_id?: string | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          label?: string
          notes?: string | null
          priority?: string
          profile_id?: string
          status?: string
          sublabel?: string | null
          tags?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_favoris_agence_id_fkey"
            columns: ["agence_id"]
            isOneToOne: false
            referencedRelation: "brh_agences_immo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_favoris_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_feed_comments: {
        Row: {
          author_pro_id: string
          body: string
          created_at: string
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          is_hidden: boolean
          parent_comment_id: string | null
          post_id: string
          updated_at: string
        }
        Insert: {
          author_pro_id: string
          body: string
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          parent_comment_id?: string | null
          post_id: string
          updated_at?: string
        }
        Update: {
          author_pro_id?: string
          body?: string
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          is_hidden?: boolean
          parent_comment_id?: string | null
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_feed_comments_author_pro_id_fkey"
            columns: ["author_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "brh_feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "brh_feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_feed_impressions: {
        Row: {
          created_at: string
          device_type: string | null
          dwell_ms: number | null
          event_type: string
          id: number
          post_id: string
          session_id: string | null
          tenant_id: string
          viewer_pro_id: string
        }
        Insert: {
          created_at?: string
          device_type?: string | null
          dwell_ms?: number | null
          event_type: string
          id?: number
          post_id: string
          session_id?: string | null
          tenant_id?: string
          viewer_pro_id: string
        }
        Update: {
          created_at?: string
          device_type?: string | null
          dwell_ms?: number | null
          event_type?: string
          id?: number
          post_id?: string
          session_id?: string | null
          tenant_id?: string
          viewer_pro_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_feed_impressions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "brh_feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_impressions_viewer_pro_id_fkey"
            columns: ["viewer_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_feed_posts: {
        Row: {
          author_pro_id: string
          author_profile_id: string | null
          body: string | null
          comment_count: number
          created_at: string
          hidden_at: string | null
          hidden_reason: string | null
          id: string
          impression_count: number
          is_hidden: boolean
          is_pinned: boolean
          like_count: number
          media_blur_zones: Json | null
          media_urls: string[] | null
          metiers_tags: string[] | null
          post_type: string
          region_codes: string[] | null
          related_chantier_offer_id: string | null
          tenant_id: string
          updated_at: string
          visibility: string
        }
        Insert: {
          author_pro_id: string
          author_profile_id?: string | null
          body?: string | null
          comment_count?: number
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          impression_count?: number
          is_hidden?: boolean
          is_pinned?: boolean
          like_count?: number
          media_blur_zones?: Json | null
          media_urls?: string[] | null
          metiers_tags?: string[] | null
          post_type: string
          region_codes?: string[] | null
          related_chantier_offer_id?: string | null
          tenant_id?: string
          updated_at?: string
          visibility?: string
        }
        Update: {
          author_pro_id?: string
          author_profile_id?: string | null
          body?: string | null
          comment_count?: number
          created_at?: string
          hidden_at?: string | null
          hidden_reason?: string | null
          id?: string
          impression_count?: number
          is_hidden?: boolean
          is_pinned?: boolean
          like_count?: number
          media_blur_zones?: Json | null
          media_urls?: string[] | null
          metiers_tags?: string[] | null
          post_type?: string
          region_codes?: string[] | null
          related_chantier_offer_id?: string | null
          tenant_id?: string
          updated_at?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_feed_posts_author_pro_id_fkey"
            columns: ["author_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_posts_author_profile_id_fkey"
            columns: ["author_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_posts_chantier_fk"
            columns: ["related_chantier_offer_id"]
            isOneToOne: false
            referencedRelation: "brh_chantier_offers"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_feed_reactions: {
        Row: {
          created_at: string
          post_id: string
          pro_id: string
          reaction_type: string
        }
        Insert: {
          created_at?: string
          post_id: string
          pro_id: string
          reaction_type?: string
        }
        Update: {
          created_at?: string
          post_id?: string
          pro_id?: string
          reaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_feed_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "brh_feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_reactions_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_feed_reports: {
        Row: {
          action_taken: string | null
          comment: string | null
          created_at: string
          id: string
          reason: string
          reported_comment_id: string | null
          reported_post_id: string | null
          reporter_pro_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tenant_id: string
        }
        Insert: {
          action_taken?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          reason: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reporter_pro_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
        }
        Update: {
          action_taken?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          reason?: string
          reported_comment_id?: string | null
          reported_post_id?: string | null
          reporter_pro_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_feed_reports_reported_comment_id_fkey"
            columns: ["reported_comment_id"]
            isOneToOne: false
            referencedRelation: "brh_feed_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_reports_reported_post_id_fkey"
            columns: ["reported_post_id"]
            isOneToOne: false
            referencedRelation: "brh_feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_reports_reporter_pro_id_fkey"
            columns: ["reporter_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_feed_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
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
      brh_intention_signals: {
        Row: {
          breakdown_succession: Json | null
          breakdown_travaux: Json | null
          breakdown_vente: Json | null
          computed_at: string
          dpe_id: number
          match_confidence: number | null
          matched_entity_id: string | null
          score_succession: number | null
          score_travaux: number | null
          score_vente: number | null
        }
        Insert: {
          breakdown_succession?: Json | null
          breakdown_travaux?: Json | null
          breakdown_vente?: Json | null
          computed_at?: string
          dpe_id: number
          match_confidence?: number | null
          matched_entity_id?: string | null
          score_succession?: number | null
          score_travaux?: number | null
          score_vente?: number | null
        }
        Update: {
          breakdown_succession?: Json | null
          breakdown_travaux?: Json | null
          breakdown_vente?: Json | null
          computed_at?: string
          dpe_id?: number
          match_confidence?: number | null
          matched_entity_id?: string | null
          score_succession?: number | null
          score_travaux?: number | null
          score_vente?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_intention_signals_dpe_id_fkey"
            columns: ["dpe_id"]
            isOneToOne: true
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
        ]
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
      brh_lead_pii_enriched: {
        Row: {
          ca_total_eur: number | null
          derniere_facture: string | null
          dpe_id: number
          email: string | null
          first_name: string | null
          full_name: string | null
          last_name: string | null
          match_confidence: number | null
          matched_at: string
          premiere_facture: string | null
          source: string
          telephone: string | null
        }
        Insert: {
          ca_total_eur?: number | null
          derniere_facture?: string | null
          dpe_id: number
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          match_confidence?: number | null
          matched_at?: string
          premiere_facture?: string | null
          source: string
          telephone?: string | null
        }
        Update: {
          ca_total_eur?: number | null
          derniere_facture?: string | null
          dpe_id?: number
          email?: string | null
          first_name?: string | null
          full_name?: string | null
          last_name?: string | null
          match_confidence?: number | null
          matched_at?: string
          premiere_facture?: string | null
          source?: string
          telephone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_lead_pii_enriched_dpe_id_fkey"
            columns: ["dpe_id"]
            isOneToOne: true
            referencedRelation: "brh_dpe_prospects"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_linked_dpe_purge_archive: {
        Row: {
          adresse: string | null
          archived_at: string | null
          code_postal: string | null
          full_name: string | null
          id: string | null
          old_confidence: number | null
          old_dpe_id: number | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          archived_at?: string | null
          code_postal?: string | null
          full_name?: string | null
          id?: string | null
          old_confidence?: number | null
          old_dpe_id?: number | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          archived_at?: string | null
          code_postal?: string | null
          full_name?: string | null
          id?: string | null
          old_confidence?: number | null
          old_dpe_id?: number | null
          ville?: string | null
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
      brh_osint_apify_homonyme_archive: {
        Row: {
          archived_at: string | null
          full_name: string | null
          id: string | null
          nom: string | null
          old_apify: Json | null
          old_facebook: string | null
          old_linkedin: string | null
          prenom: string | null
        }
        Insert: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          nom?: string | null
          old_apify?: Json | null
          old_facebook?: string | null
          old_linkedin?: string | null
          prenom?: string | null
        }
        Update: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          nom?: string | null
          old_apify?: Json | null
          old_facebook?: string | null
          old_linkedin?: string | null
          prenom?: string | null
        }
        Relationships: []
      }
      brh_osint_full_purge_archive: {
        Row: {
          archived_at: string | null
          full_name: string | null
          id: string | null
          osint_facebook: string | null
          osint_linkedin: string | null
          osint_other: Json | null
          psy_profile: Json | null
        }
        Insert: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          osint_facebook?: string | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          psy_profile?: Json | null
        }
        Update: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          osint_facebook?: string | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          psy_profile?: Json | null
        }
        Relationships: []
      }
      brh_osint_maigret_archive: {
        Row: {
          archived_at: string | null
          full_name: string | null
          id: string | null
          maigret_data: Json | null
        }
        Insert: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          maigret_data?: Json | null
        }
        Update: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          maigret_data?: Json | null
        }
        Relationships: []
      }
      brh_parcelles_cache: {
        Row: {
          centroid_lat: number | null
          centroid_lng: number | null
          code_insee: string
          commune: string | null
          contenance_m2: number | null
          created_at: string
          departement: string | null
          fetched_at: string
          geometry: Json
          idu: string
          numero: string | null
          prefixe: string | null
          raw_properties: Json | null
          section: string | null
          ttl_seconds: number
          updated_at: string
        }
        Insert: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          code_insee: string
          commune?: string | null
          contenance_m2?: number | null
          created_at?: string
          departement?: string | null
          fetched_at?: string
          geometry: Json
          idu: string
          numero?: string | null
          prefixe?: string | null
          raw_properties?: Json | null
          section?: string | null
          ttl_seconds?: number
          updated_at?: string
        }
        Update: {
          centroid_lat?: number | null
          centroid_lng?: number | null
          code_insee?: string
          commune?: string | null
          contenance_m2?: number | null
          created_at?: string
          departement?: string | null
          fetched_at?: string
          geometry?: Json
          idu?: string
          numero?: string | null
          prefixe?: string | null
          raw_properties?: Json | null
          section?: string | null
          ttl_seconds?: number
          updated_at?: string
        }
        Relationships: []
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
          is_featured: boolean
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
          is_featured?: boolean
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
          is_featured?: boolean
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
      brh_permis_construire: {
        Row: {
          adresse_complete: string | null
          code_insee_commune: string | null
          code_postal: string | null
          commune: string | null
          created_at: string
          date_daact: string | null
          date_decision: string | null
          date_depot: string
          date_dob: string | null
          date_validite_max: string | null
          decision: string | null
          demandeur_nom: string | null
          demandeur_qualite: string | null
          departement: string | null
          destination: string | null
          fetched_at: string
          id_permis: string
          lat: number | null
          lng: number | null
          nature_travaux: string | null
          nombre_logements_crees: number | null
          parcelle_idu: string | null
          raw_record: Json | null
          source_month: number
          source_year: number
          surface_plancher_m2: number | null
          surface_terrain_m2: number | null
          type_permis: string
          voie_norm: string | null
        }
        Insert: {
          adresse_complete?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_daact?: string | null
          date_decision?: string | null
          date_depot: string
          date_dob?: string | null
          date_validite_max?: string | null
          decision?: string | null
          demandeur_nom?: string | null
          demandeur_qualite?: string | null
          departement?: string | null
          destination?: string | null
          fetched_at?: string
          id_permis: string
          lat?: number | null
          lng?: number | null
          nature_travaux?: string | null
          nombre_logements_crees?: number | null
          parcelle_idu?: string | null
          raw_record?: Json | null
          source_month: number
          source_year: number
          surface_plancher_m2?: number | null
          surface_terrain_m2?: number | null
          type_permis: string
          voie_norm?: string | null
        }
        Update: {
          adresse_complete?: string | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          created_at?: string
          date_daact?: string | null
          date_decision?: string | null
          date_depot?: string
          date_dob?: string | null
          date_validite_max?: string | null
          decision?: string | null
          demandeur_nom?: string | null
          demandeur_qualite?: string | null
          departement?: string | null
          destination?: string | null
          fetched_at?: string
          id_permis?: string
          lat?: number | null
          lng?: number | null
          nature_travaux?: string | null
          nombre_logements_crees?: number | null
          parcelle_idu?: string | null
          raw_record?: Json | null
          source_month?: number
          source_year?: number
          surface_plancher_m2?: number | null
          surface_terrain_m2?: number | null
          type_permis?: string
          voie_norm?: string | null
        }
        Relationships: []
      }
      brh_personne_travaux: {
        Row: {
          cout_eur: number | null
          created_at: string
          created_by: string | null
          date_travaux: string | null
          description: string | null
          entreprise_realisatrice: string | null
          etat: string
          id: string
          personne_id: string
          poste_technique: string
          updated_at: string
        }
        Insert: {
          cout_eur?: number | null
          created_at?: string
          created_by?: string | null
          date_travaux?: string | null
          description?: string | null
          entreprise_realisatrice?: string | null
          etat?: string
          id?: string
          personne_id: string
          poste_technique: string
          updated_at?: string
        }
        Update: {
          cout_eur?: number | null
          created_at?: string
          created_by?: string | null
          date_travaux?: string | null
          description?: string | null
          entreprise_realisatrice?: string | null
          etat?: string
          id?: string
          personne_id?: string
          poste_technique?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_personne_travaux_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_personne_travaux_personne_id_fkey"
            columns: ["personne_id"]
            isOneToOne: false
            referencedRelation: "brh_personnes_historique"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_personne_visits: {
        Row: {
          employee_id: string
          id: string
          note: string | null
          personne_id: string
          seen_at: string
          visit_type: string
        }
        Insert: {
          employee_id: string
          id?: string
          note?: string | null
          personne_id: string
          seen_at?: string
          visit_type?: string
        }
        Update: {
          employee_id?: string
          id?: string
          note?: string | null
          personne_id?: string
          seen_at?: string
          visit_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_personne_visits_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_personne_visits_personne_id_fkey"
            columns: ["personne_id"]
            isOneToOne: false
            referencedRelation: "brh_personnes_historique"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_personnes_historique: {
        Row: {
          adresse: string | null
          adresse_ban_enriched_at: string | null
          adresse_ban_id: string | null
          adresse_ban_label: string | null
          adresse_ban_lat: number | null
          adresse_ban_lon: number | null
          adresse_ban_score: number | null
          adresse_norm: string | null
          ca_total_eur: number | null
          categorie: string | null
          code_postal: string | null
          contact_disponibilite: string | null
          created_at: string
          derniere_facture: string | null
          derniere_visite_terrain: string | null
          dpe_terrain_estime: string | null
          email: string | null
          employee_notes: string | null
          employee_updated_at: string | null
          employee_updated_by: string | null
          enfants: string | null
          enrichment_score: number | null
          enrichment_tier: string | null
          fingerprint_hash: string
          full_name: string | null
          id: string
          interet_brh: string | null
          is_pro: boolean | null
          link_confidence: number | null
          linked_dpe_id: number | null
          nb_rdv: number | null
          nom: string | null
          numero_norm: string | null
          osint_facebook: string | null
          osint_ghunt: Json | null
          osint_linkedin: string | null
          osint_other: Json | null
          osint_pappers: Json | null
          osint_sherlock: Json | null
          premiere_facture: string | null
          prenom: string | null
          psy_profile: Json | null
          societe: string | null
          source_primaire: string
          sources_secondaires: string[] | null
          statut: string | null
          telephone: string | null
          telephone_secondaire: string | null
          travaux_terrain_status: string | null
          updated_at: string
          ville: string | null
          voie_norm: string | null
        }
        Insert: {
          adresse?: string | null
          adresse_ban_enriched_at?: string | null
          adresse_ban_id?: string | null
          adresse_ban_label?: string | null
          adresse_ban_lat?: number | null
          adresse_ban_lon?: number | null
          adresse_ban_score?: number | null
          adresse_norm?: string | null
          ca_total_eur?: number | null
          categorie?: string | null
          code_postal?: string | null
          contact_disponibilite?: string | null
          created_at?: string
          derniere_facture?: string | null
          derniere_visite_terrain?: string | null
          dpe_terrain_estime?: string | null
          email?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          enfants?: string | null
          enrichment_score?: number | null
          enrichment_tier?: string | null
          fingerprint_hash: string
          full_name?: string | null
          id?: string
          interet_brh?: string | null
          is_pro?: boolean | null
          link_confidence?: number | null
          linked_dpe_id?: number | null
          nb_rdv?: number | null
          nom?: string | null
          numero_norm?: string | null
          osint_facebook?: string | null
          osint_ghunt?: Json | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_pappers?: Json | null
          osint_sherlock?: Json | null
          premiere_facture?: string | null
          prenom?: string | null
          psy_profile?: Json | null
          societe?: string | null
          source_primaire: string
          sources_secondaires?: string[] | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          travaux_terrain_status?: string | null
          updated_at?: string
          ville?: string | null
          voie_norm?: string | null
        }
        Update: {
          adresse?: string | null
          adresse_ban_enriched_at?: string | null
          adresse_ban_id?: string | null
          adresse_ban_label?: string | null
          adresse_ban_lat?: number | null
          adresse_ban_lon?: number | null
          adresse_ban_score?: number | null
          adresse_norm?: string | null
          ca_total_eur?: number | null
          categorie?: string | null
          code_postal?: string | null
          contact_disponibilite?: string | null
          created_at?: string
          derniere_facture?: string | null
          derniere_visite_terrain?: string | null
          dpe_terrain_estime?: string | null
          email?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          enfants?: string | null
          enrichment_score?: number | null
          enrichment_tier?: string | null
          fingerprint_hash?: string
          full_name?: string | null
          id?: string
          interet_brh?: string | null
          is_pro?: boolean | null
          link_confidence?: number | null
          linked_dpe_id?: number | null
          nb_rdv?: number | null
          nom?: string | null
          numero_norm?: string | null
          osint_facebook?: string | null
          osint_ghunt?: Json | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_pappers?: Json | null
          osint_sherlock?: Json | null
          premiere_facture?: string | null
          prenom?: string | null
          psy_profile?: Json | null
          societe?: string | null
          source_primaire?: string
          sources_secondaires?: string[] | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          travaux_terrain_status?: string | null
          updated_at?: string
          ville?: string | null
          voie_norm?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_personnes_historique_employee_updated_by_fkey"
            columns: ["employee_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_personnes_historique_linked_dpe_id_fkey"
            columns: ["linked_dpe_id"]
            isOneToOne: false
            referencedRelation: "brh_dpe_prospects"
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
      brh_plu_summaries: {
        Row: {
          ai_cost_eur_cents: number | null
          ai_model: string
          ai_tokens_input: number | null
          ai_tokens_output: number | null
          code_insee: string
          commune: string | null
          created_at: string
          departement: string | null
          fetched_at: string
          gpu_document_date: string | null
          gpu_document_id: string | null
          gpu_document_type: string | null
          gpu_pdf_url: string | null
          pdf_pages: number | null
          summary: Json
          ttl_seconds: number
          updated_at: string
        }
        Insert: {
          ai_cost_eur_cents?: number | null
          ai_model?: string
          ai_tokens_input?: number | null
          ai_tokens_output?: number | null
          code_insee: string
          commune?: string | null
          created_at?: string
          departement?: string | null
          fetched_at?: string
          gpu_document_date?: string | null
          gpu_document_id?: string | null
          gpu_document_type?: string | null
          gpu_pdf_url?: string | null
          pdf_pages?: number | null
          summary?: Json
          ttl_seconds?: number
          updated_at?: string
        }
        Update: {
          ai_cost_eur_cents?: number | null
          ai_model?: string
          ai_tokens_input?: number | null
          ai_tokens_output?: number | null
          code_insee?: string
          commune?: string | null
          created_at?: string
          departement?: string | null
          fetched_at?: string
          gpu_document_date?: string | null
          gpu_document_id?: string | null
          gpu_document_type?: string | null
          gpu_pdf_url?: string | null
          pdf_pages?: number | null
          summary?: Json
          ttl_seconds?: number
          updated_at?: string
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
      brh_pro_connections: {
        Row: {
          accepted_at: string | null
          created_at: string
          declined_at: string | null
          id: string
          message: string | null
          recipient_pro_id: string
          requester_pro_id: string
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          id?: string
          message?: string | null
          recipient_pro_id: string
          requester_pro_id: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          declined_at?: string | null
          id?: string
          message?: string | null
          recipient_pro_id?: string
          requester_pro_id?: string
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_pro_connections_recipient_pro_id_fkey"
            columns: ["recipient_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_pro_connections_requester_pro_id_fkey"
            columns: ["requester_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_pro_endorsements: {
        Row: {
          body: string | null
          chantier_offer_id: string | null
          created_at: string
          endorsed_pro_id: string
          endorser_pro_id: string
          id: string
          is_hidden: boolean
          metier_tag: string
          tenant_id: string
        }
        Insert: {
          body?: string | null
          chantier_offer_id?: string | null
          created_at?: string
          endorsed_pro_id: string
          endorser_pro_id: string
          id?: string
          is_hidden?: boolean
          metier_tag: string
          tenant_id?: string
        }
        Update: {
          body?: string | null
          chantier_offer_id?: string | null
          created_at?: string
          endorsed_pro_id?: string
          endorser_pro_id?: string
          id?: string
          is_hidden?: boolean
          metier_tag?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_pro_endorse_chantier_fk"
            columns: ["chantier_offer_id"]
            isOneToOne: false
            referencedRelation: "brh_chantier_offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_pro_endorsements_endorsed_pro_id_fkey"
            columns: ["endorsed_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_pro_endorsements_endorser_pro_id_fkey"
            columns: ["endorser_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_pro_follows: {
        Row: {
          created_at: string
          followed_pro_id: string
          follower_pro_id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          followed_pro_id: string
          follower_pro_id: string
          tenant_id?: string
        }
        Update: {
          created_at?: string
          followed_pro_id?: string
          follower_pro_id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_pro_follows_followed_pro_id_fkey"
            columns: ["followed_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_pro_follows_follower_pro_id_fkey"
            columns: ["follower_pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
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
      brh_prospect_studies: {
        Row: {
          fetched_at: string
          prospect_id: number
          source: string
          study_json: Json
        }
        Insert: {
          fetched_at?: string
          prospect_id: number
          source?: string
          study_json: Json
        }
        Update: {
          fetched_at?: string
          prospect_id?: number
          source?: string
          study_json?: Json
        }
        Relationships: [
          {
            foreignKeyName: "brh_prospect_studies_prospect_id_fkey"
            columns: ["prospect_id"]
            isOneToOne: true
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
      brh_psy_profile_archive: {
        Row: {
          archived_at: string | null
          full_name: string | null
          id: string | null
          psy_profile: Json | null
        }
        Insert: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          psy_profile?: Json | null
        }
        Update: {
          archived_at?: string | null
          full_name?: string | null
          id?: string | null
          psy_profile?: Json | null
        }
        Relationships: []
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
      brh_reseau_subscriptions: {
        Row: {
          amount_cents: number | null
          benefits: Json | null
          cancel_at_period_end: boolean
          created_at: string
          currency: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          pro_id: string | null
          profile_id: string
          stripe_customer_id: string | null
          stripe_price_id: string | null
          stripe_status: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          tier: string
          updated_at: string
        }
        Insert: {
          amount_cents?: number | null
          benefits?: Json | null
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pro_id?: string | null
          profile_id: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          tier?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number | null
          benefits?: Json | null
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          pro_id?: string | null
          profile_id?: string
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          stripe_status?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          tier?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_reseau_subscriptions_pro_id_fkey"
            columns: ["pro_id"]
            isOneToOne: false
            referencedRelation: "brh_partner_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_reseau_subscriptions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
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
      brh_satellite_analyses: {
        Row: {
          ai_cost_eur_cents: number | null
          ai_model: string
          ai_tokens_input: number | null
          ai_tokens_output: number | null
          analysis: Json
          bbox_meters: number
          created_at: string
          fetched_at: string
          image_storage_path: string | null
          image_url_used: string | null
          lat: number
          lng: number
          parcelle_idu: string
          ttl_seconds: number
          updated_at: string
        }
        Insert: {
          ai_cost_eur_cents?: number | null
          ai_model?: string
          ai_tokens_input?: number | null
          ai_tokens_output?: number | null
          analysis?: Json
          bbox_meters?: number
          created_at?: string
          fetched_at?: string
          image_storage_path?: string | null
          image_url_used?: string | null
          lat: number
          lng: number
          parcelle_idu: string
          ttl_seconds?: number
          updated_at?: string
        }
        Update: {
          ai_cost_eur_cents?: number | null
          ai_model?: string
          ai_tokens_input?: number | null
          ai_tokens_output?: number | null
          analysis?: Json
          bbox_meters?: number
          created_at?: string
          fetched_at?: string
          image_storage_path?: string | null
          image_url_used?: string | null
          lat?: number
          lng?: number
          parcelle_idu?: string
          ttl_seconds?: number
          updated_at?: string
        }
        Relationships: []
      }
      brh_sci_companies: {
        Row: {
          activite_libelle: string | null
          activite_principale: string | null
          adresse_complete: string | null
          capital_social_cents: number | null
          code_insee_commune: string | null
          code_postal: string | null
          commune: string | null
          contact_disponibilite: string | null
          created_at: string
          date_creation: string | null
          date_radiation: string | null
          deces_last_checked_at: string | null
          denomination: string
          departement: string | null
          derniere_visite_terrain: string | null
          dirigeants: Json
          dirigeants_jsonb_malformed: boolean | null
          effectif: string | null
          employee_notes: string | null
          employee_updated_at: string | null
          employee_updated_by: string | null
          entity_class: string | null
          fetched_at: string
          forme_juridique: string | null
          has_deceased_dirigeant: boolean
          interet_brh: string | null
          is_active: boolean
          is_utility: boolean
          lat: number | null
          latest_deces_date: string | null
          lng: number | null
          osint_email: string | null
          osint_linkedin: string | null
          osint_other: Json | null
          osint_phone_pro: string | null
          osint_updated_at: string | null
          osint_updated_by: string | null
          osint_website: string | null
          raw_response: Json | null
          siren: string
          solvabilite_estimee: string | null
          succession_probable_score: number
          ttl_seconds: number
          updated_at: string
        }
        Insert: {
          activite_libelle?: string | null
          activite_principale?: string | null
          adresse_complete?: string | null
          capital_social_cents?: number | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          contact_disponibilite?: string | null
          created_at?: string
          date_creation?: string | null
          date_radiation?: string | null
          deces_last_checked_at?: string | null
          denomination: string
          departement?: string | null
          derniere_visite_terrain?: string | null
          dirigeants?: Json
          dirigeants_jsonb_malformed?: boolean | null
          effectif?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          entity_class?: string | null
          fetched_at?: string
          forme_juridique?: string | null
          has_deceased_dirigeant?: boolean
          interet_brh?: string | null
          is_active?: boolean
          is_utility?: boolean
          lat?: number | null
          latest_deces_date?: string | null
          lng?: number | null
          osint_email?: string | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_phone_pro?: string | null
          osint_updated_at?: string | null
          osint_updated_by?: string | null
          osint_website?: string | null
          raw_response?: Json | null
          siren: string
          solvabilite_estimee?: string | null
          succession_probable_score?: number
          ttl_seconds?: number
          updated_at?: string
        }
        Update: {
          activite_libelle?: string | null
          activite_principale?: string | null
          adresse_complete?: string | null
          capital_social_cents?: number | null
          code_insee_commune?: string | null
          code_postal?: string | null
          commune?: string | null
          contact_disponibilite?: string | null
          created_at?: string
          date_creation?: string | null
          date_radiation?: string | null
          deces_last_checked_at?: string | null
          denomination?: string
          departement?: string | null
          derniere_visite_terrain?: string | null
          dirigeants?: Json
          dirigeants_jsonb_malformed?: boolean | null
          effectif?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          entity_class?: string | null
          fetched_at?: string
          forme_juridique?: string | null
          has_deceased_dirigeant?: boolean
          interet_brh?: string | null
          is_active?: boolean
          is_utility?: boolean
          lat?: number | null
          latest_deces_date?: string | null
          lng?: number | null
          osint_email?: string | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_phone_pro?: string | null
          osint_updated_at?: string | null
          osint_updated_by?: string | null
          osint_website?: string | null
          raw_response?: Json | null
          siren?: string
          solvabilite_estimee?: string | null
          succession_probable_score?: number
          ttl_seconds?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_sci_companies_employee_updated_by_fkey"
            columns: ["employee_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brh_sci_companies_osint_updated_by_fkey"
            columns: ["osint_updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_sci_deces_matches: {
        Row: {
          created_at: string
          date_naissance: string | null
          deces_commune: string | null
          deces_date: string | null
          deces_departement: string | null
          dirigeant_index: number
          id: string
          match_confidence: number
          match_found: boolean
          nom: string
          prenom: string
          raw_response: Json | null
          siren: string
          source: string
        }
        Insert: {
          created_at?: string
          date_naissance?: string | null
          deces_commune?: string | null
          deces_date?: string | null
          deces_departement?: string | null
          dirigeant_index: number
          id?: string
          match_confidence?: number
          match_found: boolean
          nom: string
          prenom: string
          raw_response?: Json | null
          siren: string
          source?: string
        }
        Update: {
          created_at?: string
          date_naissance?: string | null
          deces_commune?: string | null
          deces_date?: string | null
          deces_departement?: string | null
          dirigeant_index?: number
          id?: string
          match_confidence?: number
          match_found?: boolean
          nom?: string
          prenom?: string
          raw_response?: Json | null
          siren?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "brh_sci_deces_matches_siren_fkey"
            columns: ["siren"]
            isOneToOne: false
            referencedRelation: "brh_sci_companies"
            referencedColumns: ["siren"]
          },
        ]
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
      brh_social_post_templates: {
        Row: {
          content: string
          created_at: string
          hashtags: string[] | null
          id: string
          is_active: boolean
          platform: string
          slug: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_active?: boolean
          platform: string
          slug: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          hashtags?: string[] | null
          id?: string
          is_active?: boolean
          platform?: string
          slug?: string
          title?: string
        }
        Relationships: []
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
      brh_social_publications: {
        Row: {
          content_text: string
          created_at: string
          employee_id: string
          engagement_count: number | null
          id: string
          notes: string | null
          platform: string
          publication_url: string | null
          reach_count: number | null
          rejected_at: string | null
          status: string
          template_id: string | null
          validated_at: string | null
        }
        Insert: {
          content_text: string
          created_at?: string
          employee_id: string
          engagement_count?: number | null
          id?: string
          notes?: string | null
          platform: string
          publication_url?: string | null
          reach_count?: number | null
          rejected_at?: string | null
          status?: string
          template_id?: string | null
          validated_at?: string | null
        }
        Update: {
          content_text?: string
          created_at?: string
          employee_id?: string
          engagement_count?: number | null
          id?: string
          notes?: string | null
          platform?: string
          publication_url?: string | null
          reach_count?: number | null
          rejected_at?: string | null
          status?: string
          template_id?: string | null
          validated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brh_social_publications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "brh_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      brh_test_contacts_archive: {
        Row: {
          adresse: string | null
          ca_total_eur: number | null
          categorie: string | null
          code_postal: string | null
          contact_disponibilite: string | null
          created_at: string | null
          derniere_facture: string | null
          derniere_visite_terrain: string | null
          dpe_terrain_estime: string | null
          email: string | null
          employee_notes: string | null
          employee_updated_at: string | null
          employee_updated_by: string | null
          enfants: string | null
          enrichment_score: number | null
          enrichment_tier: string | null
          fingerprint_hash: string | null
          full_name: string | null
          id: string | null
          interet_brh: string | null
          is_pro: boolean | null
          link_confidence: number | null
          linked_dpe_id: number | null
          nb_rdv: number | null
          nom: string | null
          osint_facebook: string | null
          osint_ghunt: Json | null
          osint_linkedin: string | null
          osint_other: Json | null
          osint_pappers: Json | null
          osint_sherlock: Json | null
          premiere_facture: string | null
          prenom: string | null
          psy_profile: Json | null
          societe: string | null
          source_primaire: string | null
          sources_secondaires: string[] | null
          statut: string | null
          telephone: string | null
          telephone_secondaire: string | null
          travaux_terrain_status: string | null
          updated_at: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          ca_total_eur?: number | null
          categorie?: string | null
          code_postal?: string | null
          contact_disponibilite?: string | null
          created_at?: string | null
          derniere_facture?: string | null
          derniere_visite_terrain?: string | null
          dpe_terrain_estime?: string | null
          email?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          enfants?: string | null
          enrichment_score?: number | null
          enrichment_tier?: string | null
          fingerprint_hash?: string | null
          full_name?: string | null
          id?: string | null
          interet_brh?: string | null
          is_pro?: boolean | null
          link_confidence?: number | null
          linked_dpe_id?: number | null
          nb_rdv?: number | null
          nom?: string | null
          osint_facebook?: string | null
          osint_ghunt?: Json | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_pappers?: Json | null
          osint_sherlock?: Json | null
          premiere_facture?: string | null
          prenom?: string | null
          psy_profile?: Json | null
          societe?: string | null
          source_primaire?: string | null
          sources_secondaires?: string[] | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          travaux_terrain_status?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          ca_total_eur?: number | null
          categorie?: string | null
          code_postal?: string | null
          contact_disponibilite?: string | null
          created_at?: string | null
          derniere_facture?: string | null
          derniere_visite_terrain?: string | null
          dpe_terrain_estime?: string | null
          email?: string | null
          employee_notes?: string | null
          employee_updated_at?: string | null
          employee_updated_by?: string | null
          enfants?: string | null
          enrichment_score?: number | null
          enrichment_tier?: string | null
          fingerprint_hash?: string | null
          full_name?: string | null
          id?: string | null
          interet_brh?: string | null
          is_pro?: boolean | null
          link_confidence?: number | null
          linked_dpe_id?: number | null
          nb_rdv?: number | null
          nom?: string | null
          osint_facebook?: string | null
          osint_ghunt?: Json | null
          osint_linkedin?: string | null
          osint_other?: Json | null
          osint_pappers?: Json | null
          osint_sherlock?: Json | null
          premiere_facture?: string | null
          prenom?: string | null
          psy_profile?: Json | null
          societe?: string | null
          source_primaire?: string | null
          sources_secondaires?: string[] | null
          statut?: string | null
          telephone?: string | null
          telephone_secondaire?: string | null
          travaux_terrain_status?: string | null
          updated_at?: string | null
          ville?: string | null
        }
        Relationships: []
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
      brh_ext_rge_stats_commune: {
        Row: {
          code_insee_commune: string | null
          commune: string | null
          departement: string | null
          domaines: string[] | null
          nb_entreprises_rge: number | null
          nb_qualifications: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      brh_admin_set_custom_quota: {
        Args: {
          p_custom_quota: number
          p_quota_period: string
          p_target_id: string
          p_target_type: string
        }
        Returns: Json
      }
      brh_agence_invite_employee: {
        Args: { p_email: string; p_permissions?: Json }
        Returns: string
      }
      brh_agence_leaderboard: {
        Args: { p_limit?: number; p_window_days?: number }
        Returns: {
          agence_id: string
          commune: string
          contributions_count: number
          departement: string
          is_me: boolean
          leads_claimed: number
          raison_sociale: string
          rank: number
          status: string
          tier: string
        }[]
      }
      brh_agence_mlm_tree: {
        Args: { p_agence_id?: string }
        Returns: {
          agence_id: string
          commune: string
          leads_signes: number
          level: number
          parent_agence_id: string
          raison_sociale: string
          signed_at: string
          status: string
          total_filleuls: number
        }[]
      }
      brh_agence_recompute_progression: {
        Args: { p_agence_id: string }
        Returns: undefined
      }
      brh_agence_remove_member: {
        Args: { p_member_id: string }
        Returns: undefined
      }
      brh_agence_set_member_permissions: {
        Args: { p_member_id: string; p_permissions: Json }
        Returns: undefined
      }
      brh_artisan_invite_accept: {
        Args: { p_token: string; p_user_id: string }
        Returns: {
          artisan_id: string
          message: string
          success: boolean
        }[]
      }
      brh_artisan_recompute_progression: {
        Args: { p_artisan_id: string }
        Returns: undefined
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
      brh_audit_respond: {
        Args: {
          p_feedback: string
          p_feedback_message: string
          p_token: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      brh_available_employees_for_slot: {
        Args: { p_day_of_week: number; p_limit?: number; p_period: string }
        Returns: {
          activity_level: string
          activity_score: number
          employee_id: string
          full_name: string
          role_label: string
        }[]
      }
      brh_client_foncier_at_address: {
        Args: { p_personne_id: string }
        Returns: {
          client_address: Json
          dpe_matches: Json
          dvf_matches: Json
          is_tenant_of_sci: boolean
          permis_matches: Json
          sci_proprietaire: Json
        }[]
      }
      brh_client_foncier_at_address_v3: {
        Args: { p_personne_id: string }
        Returns: {
          client_address: Json
          dpe_matches: Json
          dvf_matches: Json
          is_tenant_of_sci: boolean
          permis_matches: Json
          sci_proprietaire: Json
        }[]
      }
      brh_compute_employee_level: { Args: { p_score: number }; Returns: string }
      brh_compute_employee_score: {
        Args: { p_employee_id: string }
        Returns: number
      }
      brh_compute_score_vente_v1_5: {
        Args: { p_id: number }
        Returns: {
          breakdown: Json
          proba_6m: number
          score: number
          segment: string
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
      brh_create_prospect_from_dpe: {
        Args: {
          p_dpe_id: number
          p_email?: string
          p_nom: string
          p_prenom: string
          p_telephone?: string
        }
        Returns: string
      }
      brh_cron_generate_previous_month_commissions: {
        Args: never
        Returns: {
          invoices_created: number
          total_commission_eur: number
        }[]
      }
      brh_cron_generate_with_audit: { Args: never; Returns: string }
      brh_detect_dormant_profiles: {
        Args: { p_threshold_days?: number }
        Returns: number
      }
      brh_dgfip_nearest: {
        Args: { p_lat: number; p_limit?: number; p_lng: number }
        Returns: {
          adresse: string
          code_postal: string
          commune: string
          distance_km: number
          id: string
          nom: string
          telephone: string
          type_centre: string
        }[]
      }
      brh_dirigeant_360: {
        Args: { p_dirigeant_id: string }
        Returns: {
          bodacc_alerts: Json
          dpe_detenus: Json
          identity: Json
          sci_details: Json
        }[]
      }
      brh_dirigeant_sci_rebuild: {
        Args: never
        Returns: {
          duration_ms: number
          rows_inserted: number
        }[]
      }
      brh_dirigeant_update_employee: {
        Args: { p_id: string; p_patch: Json }
        Returns: Json
      }
      brh_dirigeants_recompute: { Args: never; Returns: Json }
      brh_dirigeants_search: {
        Args: {
          p_dept?: string
          p_limit?: number
          p_multi_sci?: boolean
          p_offset?: number
          p_order_by?: string
          p_proprio_dpe?: boolean
          p_query?: string
          p_succession?: boolean
        }
        Returns: {
          date_naissance: string
          est_decede: boolean
          id: string
          interet_brh: string
          nb_dpe_total: number
          nb_sci_actives: number
          nb_sci_dirigees: number
          nom: string
          prenom: string
          sci_dirigees: Json
          succession_potentielle: boolean
          total_count: number
        }[]
      }
      brh_dpe_by_siren_paged: {
        Args: {
          p_commune?: string
          p_etiquette_dpe?: string[]
          p_limit?: number
          p_offset?: number
          p_score_max?: number
          p_score_min?: number
          p_siren: string
        }
        Returns: {
          adresse: string
          annee_construction: number
          code_postal: string
          commune: string
          etiquette_dpe: string
          id: number
          score_segment: string
          score_v2: number
          surface_habitable: number
          total_count: number
        }[]
      }
      brh_dpe_employee_update: {
        Args: { p_dpe_id: number; p_overrides: Json }
        Returns: Json
      }
      brh_dpe_role_for_personne: {
        Args: { p_dpe_id: number; p_personne_id: string }
        Returns: string
      }
      brh_dpe_summary_by_siren: {
        Args: { p_siren: string }
        Returns: {
          by_commune: Json
          by_dpe_class: Json
          by_segment: Json
          total: number
        }[]
      }
      brh_dpe_update_employee: {
        Args: { p_dpe_id: number; p_patch: Json }
        Returns: Json
      }
      brh_dvf_commune_stats: {
        Args: { p_code_insee: string; p_years_back?: number }
        Returns: {
          prix_max_eur_cents: number
          prix_median_eur_cents: number
          prix_min_eur_cents: number
          prix_moyen_eur_cents: number
          surface_median_m2: number
          total_mutations: number
        }[]
      }
      brh_effective_quota: {
        Args: { p_custom_quota: number; p_tier_quota: number }
        Returns: number
      }
      brh_entity_links_recompute: { Args: never; Returns: Json }
      brh_entity_neighbors: {
        Args: { p_id: string; p_type: string }
        Returns: {
          confidence: number
          direction: string
          display: Json
          evidence: Json
          link_type: string
          other_id: string
          other_type: string
        }[]
      }
      brh_expire_old_disponibilites: { Args: never; Returns: number }
      brh_ext_decile_to_couleur_mpr: {
        Args: { decile: number }
        Returns: string
      }
      brh_favoris_toggle: {
        Args: {
          p_entity_id: string
          p_entity_type: string
          p_label: string
          p_sublabel?: string
        }
        Returns: boolean
      }
      brh_foncier_prospects_fast: {
        Args: {
          p_dept?: string
          p_filter_avec_sci?: boolean
          p_filter_fioul?: boolean
          p_filter_particulier?: boolean
          p_filter_succession?: boolean
          p_limit?: number
          p_score_v2_min?: number
          p_search?: string
          p_segment_v2?: string
        }
        Returns: {
          adresse: string
          adresse_ban: string
          annee_construction: number
          code_postal: string
          commune: string
          departement: string
          etiquette_dpe: string
          id: number
          latitude: number
          longitude: number
          owner_name: string
          owner_siren: string
          pii_full_name: string
          score_v2: number
          score_v2_segment: string
          surface: number
          type_batiment: string
        }[]
      }
      brh_foncier_prospects_filtered: {
        Args: {
          p_audits_dyna_only?: boolean
          p_dept?: string
          p_limit?: number
          p_max_lat: number
          p_max_lng: number
          p_min_lat: number
          p_min_lng: number
          p_opah_only?: boolean
          p_ratings?: string[]
          p_rga_fort_only?: boolean
          p_score_v2_min?: number
          p_segment_v2?: string
          p_tlv_tendue_only?: boolean
        }
        Returns: {
          adresse: string
          audits_ademe_count: number
          code_insee_commune: string
          commune: string
          delta_dju_2050: number
          dpe_rating: string
          id: number
          iris_code: string
          lat: number
          lng: number
          opah_active: boolean
          rga_alea: string
          score_v2: number
          score_v2_segment: string
          surface: number
          tlv_tendue: boolean
        }[]
      }
      brh_foncier_prospects_segment_counts:
        | {
            Args: {
              p_dept?: string
              p_filter_avec_sci?: boolean
              p_filter_fioul?: boolean
              p_filter_particulier?: boolean
              p_filter_succession?: boolean
              p_score_v2_min?: number
              p_search?: string
            }
            Returns: {
              count: number
              segment: string
            }[]
          }
        | {
            Args: {
              p_dept?: string
              p_dpe_classes?: string[]
              p_filter_avec_sci?: boolean
              p_filter_fioul?: boolean
              p_filter_particulier?: boolean
              p_filter_succession?: boolean
              p_filter_with_ca?: boolean
              p_filter_with_email?: boolean
              p_filter_with_phone?: boolean
              p_filter_with_rdv?: boolean
              p_score_v2_min?: number
              p_search?: string
            }
            Returns: {
              count: number
              segment: string
            }[]
          }
      brh_foncier_prospects_table: {
        Args: {
          p_audits_dyna_only?: boolean
          p_couleur_mpr?: string
          p_dept?: string
          p_limit?: number
          p_offset?: number
          p_opah_only?: boolean
          p_rga_fort_only?: boolean
          p_score_v2_min?: number
          p_search?: string
          p_segment_v2?: string
          p_tlv_tendue_only?: boolean
        }
        Returns: {
          adresse: string
          annee_construction: number
          audits_ademe_count: number
          code_insee_commune: string
          code_postal: string
          commune: string
          conso_m2_ep: number
          couleur_mpr: string
          decile_estime: number
          departement: string
          dvf_mutation_24m: boolean
          dvf_prix_m2: number
          etiquette_dpe: string
          id: number
          iris_code: string
          opah_active: boolean
          opah_type: string
          radon_categorie: number
          rga_alea: string
          score_v2: number
          score_v2_segment: string
          surface: number
          tlv_tendue: boolean
          tlv_zonage: string
          total_count: number
          type_batiment: string
        }[]
      }
      brh_foncier_prospects_unified: {
        Args: {
          p_dept?: string
          p_dpe_classes?: string[]
          p_filter_avec_sci?: boolean
          p_filter_fioul?: boolean
          p_filter_particulier?: boolean
          p_filter_succession?: boolean
          p_filter_with_ca?: boolean
          p_filter_with_email?: boolean
          p_filter_with_phone?: boolean
          p_filter_with_rdv?: boolean
          p_limit?: number
          p_offset?: number
          p_score_v2_min?: number
          p_search?: string
          p_segment_v2?: string
        }
        Returns: {
          adresse: string
          adresse_ban: string
          annee_construction: number
          audits_ademe_count: number
          code_insee_commune: string
          code_postal: string
          commune: string
          conso_m2_ep: number
          couleur_mpr: string
          decile_estime: number
          departement: string
          description_chauffage: string
          description_ecs: string
          dvf_date: string
          dvf_mutation_24m: boolean
          dvf_prix: number
          dvf_prix_m2: number
          energie_chauffage: string
          etiquette_dpe: string
          id: number
          iris_code: string
          latitude: number
          longitude: number
          opah_active: boolean
          opah_type: string
          owner_name: string
          owner_siren: string
          owner_type: string
          pii_ca_total_eur: number
          pii_derniere_facture: string
          pii_email: string
          pii_full_name: string
          pii_premiere_facture: string
          pii_source: string
          pii_telephone: string
          qualite_isolation_murs: string
          radon_categorie: number
          rga_alea: string
          score_v2: number
          score_v2_segment: string
          surface: number
          tlv_tendue: boolean
          tlv_zonage: string
          total_count: number
          type_batiment: string
          type_ventilation: string
          ubat: number
        }[]
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
      brh_get_my_lead_breakdown: {
        Args: never
        Returns: {
          agence_id: string
          bonus_total_remaining: number
          contribution_consumed: number
          contribution_remaining: number
          contribution_unlocked: number
          referral_consumed: number
          referral_remaining: number
          referral_unlocked: number
          social_consumed: number
          social_remaining: number
          social_unlocked: number
          tier_quota: number
          tier_remaining: number
          tier_subscription: string
          tier_used: number
          total_remaining: number
        }[]
      }
      brh_get_my_referral_tree: {
        Args: never
        Returns: {
          agence_id: string
          cash_earned_cents: number
          chain_level: number
          commune: string
          created_at: string
          departement: string
          leads_earned: number
          parent_agence_id: string
          raison_sociale: string
          status: string
        }[]
      }
      brh_get_public_agence: {
        Args: { p_agence_id: string }
        Returns: {
          code_postal: string
          commune: string
          departement: string
          id: string
          raison_sociale: string
          site_web: string
          status: string
        }[]
      }
      brh_get_public_artisan: {
        Args: { p_artisan_id: string }
        Returns: {
          code_postal: string
          commune: string
          departement: string
          geste_specialites: string[]
          id: string
          nom_entreprise: string
          nombre_chantiers_brh: number
          rge_certifications: Json
          score_qualite: number
          tier: string
        }[]
      }
      brh_grant_lead_claim: {
        Args: { p_agence_id: string; p_prospect_id: number }
        Returns: {
          assignment_id: string
          consumed_from: string
        }[]
      }
      brh_mark_commission_paid: {
        Args: { p_invoice_id: string; p_stripe_payment_intent?: string }
        Returns: boolean
      }
      brh_match_dpe_by_address: {
        Args: { p_adresse: string; p_code_postal: string }
        Returns: {
          adresse_dpe: string
          dpe_id: number
          etiquette_dpe: string
          match_kind: string
          numero_dpe: string
          owner_name: string
          owner_siren: string
          owner_type: string
        }[]
      }
      brh_normalize_adresse: {
        Args: { p_adresse: string }
        Returns: {
          adresse_norm: string
          numero_norm: string
          voie_norm: string
        }[]
      }
      brh_partner_search: {
        Args: { p_audience: string; p_limit?: number; p_query?: string }
        Returns: {
          code_postal: string
          departement: string
          email: string
          full_name: string
          id: string
          metier: string
          societe: string
          telephone: string
          ville: string
        }[]
      }
      brh_personne_360: {
        Args: { p_personne_id: string }
        Returns: {
          adresses_liees: Json
          bodacc_alerts: Json
          identity: Json
          links_summary: Json
          mutations_dvf: Json
          sci_deces_pairs: Json
          sci_dirigees: Json
        }[]
      }
      brh_personne_enrichment_score: {
        Args: {
          p: Database["public"]["Tables"]["brh_personnes_historique"]["Row"]
        }
        Returns: number
      }
      brh_personne_enrichment_tier: { Args: { score: number }; Returns: string }
      brh_personne_mark_seen: {
        Args: { p_note?: string; p_personne_id: string; p_visit_type?: string }
        Returns: Json
      }
      brh_personne_signals_externes: {
        Args: { p_personne_id: string }
        Returns: {
          bodacc_alerts: Json
          dvf_mutations: Json
          sci_deces_matches: Json
        }[]
      }
      brh_personne_travaux_list: {
        Args: { p_personne_id: string }
        Returns: {
          cout_eur: number
          created_by_name: string
          date_travaux: string
          description: string
          entreprise_realisatrice: string
          etat: string
          id: string
          poste_technique: string
          updated_at: string
        }[]
      }
      brh_personne_travaux_upsert: {
        Args: { p_patch: Json; p_personne_id: string; p_poste: string }
        Returns: Json
      }
      brh_personne_update_employee: {
        Args: { p_id: string; p_patch: Json }
        Returns: Json
      }
      brh_personne_visits_list: {
        Args: { p_personne_id: string }
        Returns: {
          employee_email: string
          employee_id: string
          employee_name: string
          id: string
          note: string
          seen_at: string
          visit_type: string
        }[]
      }
      brh_personnes_search: {
        Args: {
          p_dept?: string
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_statut?: string
          p_tier?: string
          p_with_ca?: boolean
          p_with_dpe_link?: boolean
          p_with_email?: boolean
          p_with_rdv?: boolean
          p_with_tel?: boolean
        }
        Returns: {
          adresse: string
          ca_total_eur: number
          categorie: string
          code_postal: string
          derniere_facture: string
          email: string
          enfants: string
          enrichment_score: number
          enrichment_tier: string
          fingerprint_hash: string
          full_name: string
          id: string
          is_pro: boolean
          link_confidence: number
          linked_dpe_id: number
          nb_rdv: number
          nom: string
          osint_facebook: string
          osint_linkedin: string
          osint_other: Json
          premiere_facture: string
          prenom: string
          psy_profile: Json
          societe: string
          source_primaire: string
          sources_secondaires: string[]
          statut: string
          telephone: string
          total_count: number
          ville: string
        }[]
      }
      brh_pro_can_view_post: { Args: { p_post_id: string }; Returns: boolean }
      brh_pro_in_network: {
        Args: { p_target: string; p_viewer: string }
        Returns: boolean
      }
      brh_recalc_score_v2_full: {
        Args: { p_dept: string }
        Returns: {
          avg_score: number
          dept: string
          max_score: number
          rows_updated: number
        }[]
      }
      brh_release_expired_assignments: { Args: never; Returns: number }
      brh_reset_agence_monthly_quotas: { Args: never; Returns: number }
      brh_reset_employee_leads_counter: { Args: never; Returns: number }
      brh_sci_recompute_succession_score: {
        Args: { p_siren: string }
        Returns: undefined
      }
      brh_sci_search_dirigeant: {
        Args: { p_limit?: number; p_name: string }
        Returns: {
          code_postal: string
          commune: string
          denomination: string
          dirigeants: Json
          has_deceased_dirigeant: boolean
          is_active: boolean
          is_utility: boolean
          siren: string
        }[]
      }
      brh_sci_update_employee: {
        Args: { p_patch: Json; p_siren: string }
        Returns: Json
      }
      brh_submit_public_appointment: {
        Args: {
          p_assigned_employee_id?: string
          p_contact_email: string
          p_contact_name: string
          p_contact_phone: string
          p_diagnostic_id?: string
          p_notes?: string
          p_preferred_slot?: string
          p_referral_code?: string
          p_requested_date?: string
          p_type: string
        }
        Returns: string
      }
      brh_update_artisan_score: {
        Args: { p_artisan_id: string }
        Returns: undefined
      }
      brh_user_agence_id: { Args: never; Returns: string }
      brh_user_artisan_id: { Args: never; Returns: string }
      brh_user_belongs_to_agence: {
        Args: { p_agence_id: string }
        Returns: boolean
      }
      brh_user_can: {
        Args: { p_perm_key: string; p_user_id: string }
        Returns: boolean
      }
      brh_user_has_agence_access: { Args: never; Returns: boolean }
      brh_user_is_active_agence_signer: { Args: never; Returns: boolean }
      brh_user_is_signer_of_agence: {
        Args: { p_agence_id: string }
        Returns: boolean
      }
      brh_user_pro_id: { Args: never; Returns: string }
      brh_user_reseau_tier: { Args: never; Returns: string }
      brh_visits_recent_bulk: {
        Args: { p_personne_ids: string[] }
        Returns: {
          employee_id: string
          employee_name: string
          personne_id: string
          seen_at: string
          visit_count_total: number
        }[]
      }
      f_unaccent: { Args: { input_text: string }; Returns: string }
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
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
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
