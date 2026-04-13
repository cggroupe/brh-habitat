// Types pour la plateforme partenaires

// === Enums ===
export type CompanyProfession = 'architecte' | 'agent_immobilier' | 'maitre_oeuvre' | 'courtier' | 'autre'
export type CompanyLevel = 'bronze' | 'silver' | 'gold' | 'platinum'
export type AffiliateLevel = 'standard' | 'ambassadeur' | 'expert' | 'vip'
export type CompanyMemberRole = 'owner' | 'member'
export type ProspectSourceType = 'pro' | 'particulier'
export type ProspectStatus = 'nouveau' | 'etude' | 'devis_envoye' | 'signe' | 'termine' | 'perdu'
export type ProspectUrgency = 'immediate' | '3mois' | '6mois' | 'plus'
export type ProspectFileType = 'devis_concurrent' | 'dpe' | 'diagnostic' | 'photo' | 'autre'
export type CommissionStatus = 'en_attente' | 'validee' | 'versee'
export type PaymentMethod = 'virement' | 'cheque'
export type PointsTransactionType = 'parrainage' | 'bonus_mensuel' | 'bonus_annuel' | 'echange_cadeau' | 'ajustement_admin'
export type RewardType = 'produit_physique' | 'bon_achat' | 'reduction_travaux'
export type RewardClaimStatus = 'en_attente' | 'validee' | 'preparee' | 'envoyee' | 'refusee'
export type MessageParticipantType = 'pro' | 'particulier'

// === Row types ===

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
}

export interface BrhCompanyMemberRow {
  id: string
  company_id: string
  profile_id: string
  member_role: CompanyMemberRole
  joined_at: string
}

export interface BrhAffiliateRow {
  id: string
  referral_code: string
  short_code: string | null
  points_balance: number
  total_points_earned: number
  level: AffiliateLevel
  created_at: string
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
  estimated_budget: string | null
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
  prospect_id: string
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
  payment_method: PaymentMethod | null
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
}

export interface BrhMessageThreadRow {
  id: string
  subject: string
  participant_id: string | null
  participant_type: MessageParticipantType
  last_message_at: string
  is_archived: boolean
  created_at: string
}

export interface BrhMessageRow {
  id: string
  thread_id: string
  sender_id: string | null
  body: string
  is_read: boolean
  read_at: string | null
  attachment_url: string | null
  attachment_name: string | null
  created_at: string
}

export interface BrhNotificationRow {
  id: string
  recipient_id: string
  type: string
  title: string
  body: string | null
  reference_type: string | null
  reference_id: string | null
  is_read: boolean
  created_at: string
}

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google_business'
export type SocialPostType = 'post' | 'video' | 'article' | 'review'
export type SocialPostStatus = 'en_attente' | 'en_cours_verification' | 'validee' | 'refusee' | 'expiree'

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

export interface BrhSimulationShareRow {
  id: string
  affiliate_id: string | null
  referral_code: string
  work_type: string | null
  click_count: number
  simulation_count: number
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
}
