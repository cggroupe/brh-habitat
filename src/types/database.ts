export type DiagnosticStatus = 'draft' | 'pending' | 'analyzed' | 'contacted' | 'closed'
export type CaseStatus = 'nouveau' | 'en_cours' | 'devis' | 'travaux' | 'termine'
export type AppointmentType = 'diagnostic' | 'devis' | 'visite' | 'suivi'
export type AppointmentStatus = 'pending' | 'demande' | 'confirme' | 'annule' | 'termine'
export type ContactStatus = 'nouveau' | 'lu' | 'traite'
export type DpeRating = 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G'
export type UserRole = 'user' | 'admin' | 'pro' | 'particulier'
export type Locale = 'fr' | 'en'
export type HealthDomain = 'humidite' | 'isolation' | 'ventilation' | 'menuiseries' | 'electricite' | 'toiture' | 'plomberie'
export type HealthUrgency = 'faible' | 'modere' | 'eleve' | 'critique'
export type WorkStatus = 'planifie' | 'en_cours' | 'termine'
export type DocumentType = 'dpe' | 'amiante' | 'plomb' | 'electricite' | 'gaz' | 'erp' | 'termites' | 'assainissement' | 'autre'

// --- Types for partner platform tables ---
export type CompanyProfession = 'architecte' | 'agent_immobilier' | 'maitre_oeuvre' | 'courtier' | 'autre'
export type CompanyLevel = 'bronze' | 'silver' | 'gold' | 'platinum'
export type MemberRole = 'owner' | 'member'
export type AffiliateLevel = 'standard' | 'ambassadeur' | 'expert' | 'vip'
export type ProspectSourceType = 'pro' | 'particulier'
export type ProspectStatus = 'nouveau' | 'etude' | 'devis_envoye' | 'signe' | 'termine' | 'perdu'
export type ProspectUrgency = 'immediate' | '3mois' | '6mois' | 'plus'
export type ProspectFileType = 'devis_concurrent' | 'dpe' | 'diagnostic' | 'photo' | 'autre'
export type CommissionStatus = 'en_attente' | 'validee' | 'versee'
export type PointsTransactionType = 'parrainage' | 'bonus_mensuel' | 'bonus_annuel' | 'echange_cadeau' | 'ajustement_admin'
export type RewardType = 'produit_physique' | 'bon_achat' | 'reduction_travaux'
export type RewardClaimStatus = 'en_attente' | 'validee' | 'preparee' | 'envoyee' | 'refusee'
export type ParticipantType = 'pro' | 'particulier'
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google_business'
export type SocialPostType = 'post' | 'video' | 'article' | 'review'
export type SocialPostStatus = 'en_attente' | 'en_cours_verification' | 'validee' | 'refusee' | 'expiree'
export type RecruitmentSourceType = 'commission_pro' | 'points_particulier'
export type BadgeConditionType = 'parrainages_total' | 'parrainages_signes' | 'points_earned' | 'level_reached' | 'recruits_total' | 'chiffrages_total'

export interface BrhDiagnosticRow {
  id: string
  user_id: string | null
  types: string[]
  property_type: string | null
  property_address: string | null
  property_surface: number | null
  property_year: number | null
  property_floors: number | null
  symptoms: Record<string, string[]>
  photos: string[]
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  /** Cast to DiagnosticResult from lib/diagnostic-engine at usage site */
  results: Record<string, unknown> | null
  status: DiagnosticStatus
  current_step: number
  /** Cast to DiagnosticEquipment from stores/diagnosticStore at usage site */
  equipment: Record<string, unknown> | null
  admin_notes: string | null
  referral_code: string | null
  created_at: string
  updated_at: string
}

export interface BrhHomeRow {
  id: string
  user_id: string
  address: string
  city: string
  postal_code: string
  property_type: string
  surface: number
  year_built: number
  floors: number
  heating_type: string | null
  insulation_type: string | null
  dpe_rating: DpeRating | null
  health_score: number | null
  photos: string[]
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhCaseRow {
  id: string
  user_id: string
  home_id: string | null
  diagnostic_id: string | null
  title: string
  description: string | null
  work_types: string[]
  status: CaseStatus
  estimated_budget: number | null
  start_date: string | null
  end_date: string | null
  documents: string[]
  admin_notes: string | null
  assigned_to: string | null
  created_at: string
  updated_at: string
}

export interface BrhAppointmentRow {
  id: string
  user_id: string | null
  case_id: string | null
  home_id: string | null
  diagnostic_id: string | null
  type: AppointmentType
  requested_date: string
  confirmed_date: string | null
  status: AppointmentStatus
  contact_name: string | null
  contact_phone: string | null
  contact_email: string | null
  preferred_slot: string | null
  notes: string | null
  admin_notes: string | null
  referral_code: string | null
  created_at: string
  updated_at: string
}

export interface BrhContactRow {
  id: string
  nom: string
  email: string
  telephone: string | null
  sujet: string | null
  message: string
  status: ContactStatus
  admin_notes: string | null
  /** Phase 16.1 — agence d'origine si lead arrivé via vitrine QR /a/:id. */
  referred_by_agence_id: string | null
  created_at: string
  updated_at: string
}

export interface BrhArticleRow {
  id: string
  slug: string
  title: string
  excerpt: string
  content: string
  category: string
  tags: string[]
  cover_image: string | null
  author: string
  seo_title: string | null
  seo_description: string | null
  published: boolean
  read_time: number | null
  created_at: string
  updated_at: string
}

export interface ProfileRow {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url: string | null
  phone: string | null
  is_active: boolean
  locale: Locale | null
  created_at: string
  updated_at: string
}

export interface BrhHealthRecordRow {
  id: string
  home_id: string
  user_id: string
  domain: HealthDomain
  score: number | null
  urgency: HealthUrgency | null
  symptoms: string[]
  notes: string | null
  assessed_at: string
  created_at: string
  updated_at: string
}

export interface BrhWorkHistoryRow {
  id: string
  home_id: string
  user_id: string
  domain: HealthDomain | 'autre'
  title: string
  description: string | null
  contractor: string | null
  cost: number | null
  status: WorkStatus
  work_date: string | null
  completed_at: string | null
  documents: string[]
  created_at: string
  updated_at: string
}

export interface BrhHomeDocumentRow {
  id: string
  home_id: string
  user_id: string
  doc_type: DocumentType
  title: string
  file_url: string | null
  issued_at: string | null
  expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ============================================================
// Partner platform Row interfaces
// ============================================================

export interface BrhCompanyRow {
  id: string
  owner_id: string | null
  name: string
  siret: string | null
  address: string | null
  city: string | null
  postal_code: string | null
  logo_url: string | null
  website: string | null
  profession: CompanyProfession | null
  commission_rate_percent: number
  level: CompanyLevel
  total_ca_apporte: number
  is_active: boolean
  created_at: string
  updated_at: string
  // Added by 20260421000000_siret_verification_fields
  legal_name: string | null
  naf_code: string | null
  naf_label: string | null
  siren: string | null
  siret_verified_at: string | null
  entreprise_category: string | null
  date_creation: string | null
  // Added by 20260403800000_recruitment_system
  recruited_by: string | null
  // Added by 20260706610000_brh_partenaires_opt_in — opt-in annuaire public /partenaires
  is_public_partner: boolean
}

export interface BrhCompanyMemberRow {
  id: string
  company_id: string | null
  profile_id: string | null
  member_role: MemberRole
  joined_at: string
}

export interface BrhAffiliateRow {
  id: string
  referral_code: string
  points_balance: number
  total_points_earned: number
  level: AffiliateLevel
  created_at: string
  // Added by 20260403400000_viral_features
  short_code: string | null
  // Added by 20260403800000_recruitment_system
  recruited_by: string | null
}

export interface BrhProspectRow {
  id: string
  source_type: ProspectSourceType
  company_id: string | null
  submitted_by: string | null
  affiliate_id: string | null
  client_first_name: string
  client_last_name: string
  client_phone: string
  client_email: string | null
  client_address: string | null
  client_city: string | null
  client_postal_code: string | null
  work_type: string[]
  /** Budget estimé en centimes (INTEGER, converti par migration audit_fixes_v5) */
  estimated_budget: number | null
  urgency: ProspectUrgency | null
  status: ProspectStatus
  status_updated_at: string
  notes: string | null
  admin_notes: string | null
  lead_score: number
  crm_id: string | null
  crm_synced_at: string | null
  created_at: string
  updated_at: string
}

export interface BrhProspectFileRow {
  id: string
  prospect_id: string | null
  uploaded_by: string | null
  file_name: string
  file_type: ProspectFileType
  storage_path: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

export interface BrhQuoteRow {
  id: string
  prospect_id: string | null
  amount: number
  signed_at: string
  payment_method: 'virement' | 'cheque' | null
  commission_rate_percent: number | null
  commission_amount: number | null
  commission_status: CommissionStatus
  commission_paid_at: string | null
  points_awarded: number
  points_awarded_at: string | null
  created_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhPointsTransactionRow {
  id: string
  affiliate_id: string | null
  points: number
  type: PointsTransactionType
  reference_id: string | null
  description: string | null
  created_at: string
}

export interface BrhRewardsCatalogRow {
  id: string
  name: string
  description: string | null
  image_url: string | null
  type: RewardType
  points_required: number
  value_cents: number | null
  stock: number | null
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export interface BrhRewardClaimRow {
  id: string
  affiliate_id: string | null
  reward_id: string | null
  points_spent: number
  status: RewardClaimStatus
  shipping_address: string | null
  admin_notes: string | null
  created_at: string
  updated_at: string
  // Added by 20260403400000_viral_features (cashback)
  discount_code: string | null
  discount_expires_at: string | null
  discount_used: boolean
  discount_used_at: string | null
}

export interface BrhMessageThreadRow {
  id: string
  subject: string
  participant_id: string | null
  participant_type: ParticipantType
  last_message_at: string
  is_archived: boolean
  created_at: string
}

export interface BrhMessageRow {
  id: string
  thread_id: string | null
  sender_id: string | null
  body: string
  is_read: boolean
  read_at: string | null
  created_at: string
  // Added by 20260413100000_improvements_batch
  attachment_url: string | null
  attachment_name: string | null
}

export interface BrhNotificationRow {
  id: string
  recipient_id: string | null
  type: string
  title: string
  body: string | null
  reference_type: string | null
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export interface BrhPlatformSettingsRow {
  key: string
  points_per_signed_quote: number
  pro_silver_threshold: number
  pro_gold_threshold: number
  pro_platinum_threshold: number
  particulier_ambassadeur_threshold: number
  particulier_expert_threshold: number
  particulier_vip_threshold: number
  monthly_bonus_threshold: number
  monthly_bonus_points: number
  updated_at: string
  // Added by 20260403800000_recruitment_system
  recruitment_commission_percent: number
  // Added by 20260404000000_multilevel_recruitment
  recruitment_max_levels: number
  // Added by 20260403400000_viral_features (social rewards)
  social_reward_facebook_post: number
  social_reward_instagram_post: number
  social_reward_linkedin_post: number
  social_reward_linkedin_article: number
  social_reward_video: number
  social_reward_google_review: number
  social_monthly_limit: number
  // Added by 20260422000000_admin_emails_list
  admin_emails: string[]
}

export interface BrhChiffrageRow {
  id: string
  user_id: string | null
  company_id: string | null
  reference: string
  client_name: string
  client_address: string | null
  client_phone: string | null
  projet_titre: string
  projet_description: string | null
  lignes: Record<string, unknown>[]
  total_ht: number
  tva_rate: number
  total_tva: number
  total_ttc: number
  notes: string | null
  created_at: string
}

export interface BrhRecruitmentCommissionRow {
  id: string
  recruiter_id: string | null
  recruited_id: string | null
  source_type: RecruitmentSourceType
  source_amount: number
  commission_rate_percent: number
  commission_amount: number
  reference_id: string | null
  status: CommissionStatus
  paid_at: string | null
  notes: string | null
  created_at: string
  // Added by 20260404000000_multilevel_recruitment
  chain_level: number
}

export interface BrhSimulationShareRow {
  id: string
  affiliate_id: string | null
  referral_code: string
  work_type: string | null
  click_count: number
  simulation_count: number
  created_at: string
}

export interface BrhSimulationLeadRow {
  id: string
  share_id: string | null
  affiliate_id: string | null
  visitor_session: string | null
  simulation_data: Record<string, unknown> | null
  converted_to_prospect: boolean
  prospect_id: string | null
  created_at: string
}

export interface BrhSocialPostRow {
  id: string
  submitted_by: string
  submitter_role: 'pro' | 'particulier'
  company_id: string | null
  platform: SocialPlatform
  post_type: SocialPostType
  post_url: string
  screenshot_path: string
  description: string | null
  reward_amount_cents: number | null
  reward_points: number | null
  reward_type: 'carte_cadeau' | 'points'
  status: SocialPostStatus
  rejection_reason: string | null
  validated_at: string | null
  expiry_check_date: string | null
  expiry_confirmed: boolean
  is_duplicate: boolean
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface BrhBadgeRow {
  id: string
  code: string
  name: string
  description: string
  icon: string
  condition_type: BadgeConditionType
  condition_value: number
  sort_order: number
  created_at: string
}

export interface BrhUserBadgeRow {
  id: string
  user_id: string
  badge_id: string
  unlocked_at: string
}

export interface BrhCompanyInvitationRow {
  id: string
  company_id: string
  invited_by: string
  email: string
  member_role: MemberRole
  token: string
  expires_at: string
  accepted_at: string | null
  accepted_by: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      // --- Core tables (original) ---
      brh_diagnostics: { Row: BrhDiagnosticRow; Insert: Omit<BrhDiagnosticRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhDiagnosticRow, 'id'>> }
      brh_homes: { Row: BrhHomeRow; Insert: Omit<BrhHomeRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhHomeRow, 'id'>> }
      brh_cases: { Row: BrhCaseRow; Insert: Omit<BrhCaseRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhCaseRow, 'id'>> }
      brh_appointments: { Row: BrhAppointmentRow; Insert: Omit<BrhAppointmentRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhAppointmentRow, 'id'>> }
      brh_articles: { Row: BrhArticleRow; Insert: Omit<BrhArticleRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhArticleRow, 'id'>> }
      brh_contacts: { Row: BrhContactRow; Insert: Omit<BrhContactRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhContactRow, 'id'>> }
      profiles: { Row: ProfileRow; Insert: Omit<ProfileRow, 'created_at' | 'updated_at'>; Update: Partial<Omit<ProfileRow, 'id'>> }
      brh_health_records: { Row: BrhHealthRecordRow; Insert: Omit<BrhHealthRecordRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhHealthRecordRow, 'id'>> }
      brh_work_history: { Row: BrhWorkHistoryRow; Insert: Omit<BrhWorkHistoryRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhWorkHistoryRow, 'id'>> }
      brh_home_documents: { Row: BrhHomeDocumentRow; Insert: Omit<BrhHomeDocumentRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhHomeDocumentRow, 'id'>> }
      // --- Partner platform tables ---
      brh_companies: { Row: BrhCompanyRow; Insert: Omit<BrhCompanyRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhCompanyRow, 'id'>> }
      brh_company_members: { Row: BrhCompanyMemberRow; Insert: Omit<BrhCompanyMemberRow, 'id' | 'joined_at'>; Update: Partial<Omit<BrhCompanyMemberRow, 'id'>> }
      brh_affiliates: { Row: BrhAffiliateRow; Insert: Omit<BrhAffiliateRow, 'created_at'>; Update: Partial<BrhAffiliateRow> }
      brh_prospects: { Row: BrhProspectRow; Insert: Omit<BrhProspectRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhProspectRow, 'id'>> }
      brh_prospect_files: { Row: BrhProspectFileRow; Insert: Omit<BrhProspectFileRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhProspectFileRow, 'id'>> }
      brh_quotes: { Row: BrhQuoteRow; Insert: Omit<BrhQuoteRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhQuoteRow, 'id'>> }
      brh_points_transactions: { Row: BrhPointsTransactionRow; Insert: Omit<BrhPointsTransactionRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhPointsTransactionRow, 'id'>> }
      brh_rewards_catalog: { Row: BrhRewardsCatalogRow; Insert: Omit<BrhRewardsCatalogRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhRewardsCatalogRow, 'id'>> }
      brh_reward_claims: { Row: BrhRewardClaimRow; Insert: Omit<BrhRewardClaimRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhRewardClaimRow, 'id'>> }
      brh_message_threads: { Row: BrhMessageThreadRow; Insert: Omit<BrhMessageThreadRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhMessageThreadRow, 'id'>> }
      brh_messages: { Row: BrhMessageRow; Insert: Omit<BrhMessageRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhMessageRow, 'id'>> }
      brh_notifications: { Row: BrhNotificationRow; Insert: Omit<BrhNotificationRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhNotificationRow, 'id'>> }
      brh_platform_settings: { Row: BrhPlatformSettingsRow; Insert: Partial<BrhPlatformSettingsRow>; Update: Partial<BrhPlatformSettingsRow> }
      brh_chiffrages: { Row: BrhChiffrageRow; Insert: Omit<BrhChiffrageRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhChiffrageRow, 'id'>> }
      brh_recruitment_commissions: { Row: BrhRecruitmentCommissionRow; Insert: Omit<BrhRecruitmentCommissionRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhRecruitmentCommissionRow, 'id'>> }
      brh_simulation_shares: { Row: BrhSimulationShareRow; Insert: Omit<BrhSimulationShareRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhSimulationShareRow, 'id'>> }
      brh_simulation_leads: { Row: BrhSimulationLeadRow; Insert: Omit<BrhSimulationLeadRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhSimulationLeadRow, 'id'>> }
      brh_social_posts: { Row: BrhSocialPostRow; Insert: Omit<BrhSocialPostRow, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<BrhSocialPostRow, 'id'>> }
      brh_badges: { Row: BrhBadgeRow; Insert: Omit<BrhBadgeRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhBadgeRow, 'id'>> }
      brh_user_badges: { Row: BrhUserBadgeRow; Insert: Omit<BrhUserBadgeRow, 'id' | 'unlocked_at'>; Update: Partial<Omit<BrhUserBadgeRow, 'id'>> }
      brh_company_invitations: { Row: BrhCompanyInvitationRow; Insert: Omit<BrhCompanyInvitationRow, 'id' | 'created_at'>; Update: Partial<Omit<BrhCompanyInvitationRow, 'id'>> }
    }
  }
}
