// Types pour la plateforme partenaires
//
// Phase B4 complet (2026-05-24) : les interfaces Row sont désormais alignées
// sur les types générés `Database['public']['Tables']['xxx']['Row']`. Cela
// reflète la nullabilité réelle de la base et évite les TS2322 à la couche API.
// Les helpers downstream qui veulent du strict appliquent des defaults via
// `?? 0`, `?? ''`, `?? 'bronze'`, etc.

import type { Database } from './database-generated'

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
export type MessageParticipantType = 'pro' | 'particulier' | 'agence'

// === Row types (alias des types générés) ===
export type BrhCompanyRow = Database['public']['Tables']['brh_companies']['Row']
export type BrhCompanyMemberRow = Database['public']['Tables']['brh_company_members']['Row']
export type BrhAffiliateRow = Database['public']['Tables']['brh_affiliates']['Row']
export type BrhProspectRow = Database['public']['Tables']['brh_prospects']['Row']
export type BrhProspectFileRow = Database['public']['Tables']['brh_prospect_files']['Row']
export type BrhQuoteRow = Database['public']['Tables']['brh_quotes']['Row']
export type BrhPointsTransactionRow = Database['public']['Tables']['brh_points_transactions']['Row']
export type BrhRewardsCatalogRow = Database['public']['Tables']['brh_rewards_catalog']['Row']
export type BrhRewardClaimRow = Database['public']['Tables']['brh_reward_claims']['Row']
export type BrhMessageThreadRow = Database['public']['Tables']['brh_message_threads']['Row']
export type BrhMessageRow = Database['public']['Tables']['brh_messages']['Row']
export type BrhNotificationRow = Database['public']['Tables']['brh_notifications']['Row']

// === Social posts ===
export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'google_business'
export type SocialPostType = 'post' | 'video' | 'article' | 'review'
export type SocialPostStatus = 'en_attente' | 'en_cours_verification' | 'validee' | 'refusee' | 'expiree'

export type BrhSocialPostRow = Database['public']['Tables']['brh_social_posts']['Row']

export type BrhSimulationShareRow = Database['public']['Tables']['brh_simulation_shares']['Row']

// === Recruitment ===
export type RecruitmentCommissionSourceType = 'commission_pro' | 'points_particulier'
export type RecruitmentCommissionStatus = 'en_attente' | 'validee' | 'versee'

export type BrhRecruitmentCommissionRow = Database['public']['Tables']['brh_recruitment_commissions']['Row']

// === Badges / Gamification ===
export type BadgeConditionType = 'parrainages_total' | 'parrainages_signes' | 'points_earned' | 'level_reached' | 'recruits_total' | 'chiffrages_total'

export type BrhBadgeRow = Database['public']['Tables']['brh_badges']['Row']
export type BrhUserBadgeRow = Database['public']['Tables']['brh_user_badges']['Row']

// === Chiffrages ===
export type BrhChiffrageRow = Database['public']['Tables']['brh_chiffrages']['Row']

// === Simulation Leads ===
export type BrhSimulationLeadRow = Database['public']['Tables']['brh_simulation_leads']['Row']

// === Platform Settings ===
export type BrhPlatformSettingsRow = Database['public']['Tables']['brh_platform_settings']['Row']
