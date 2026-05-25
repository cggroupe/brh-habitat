import type { Database } from './database-generated'

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

export type BrhDiagnosticRow = Database['public']['Tables']['brh_diagnostics']['Row']
export type BrhHomeRow = Database['public']['Tables']['brh_homes']['Row']
export type BrhCaseRow = Database['public']['Tables']['brh_cases']['Row']
export type BrhAppointmentRow = Database['public']['Tables']['brh_appointments']['Row']
export type BrhContactRow = Database['public']['Tables']['brh_contacts']['Row']
export type BrhArticleRow = Database['public']['Tables']['brh_articles']['Row']
export type ProfileRow = Database['public']['Tables']['profiles']['Row']
export type BrhHealthRecordRow = Database['public']['Tables']['brh_health_records']['Row']
export type BrhWorkHistoryRow = Database['public']['Tables']['brh_work_history']['Row']
export type BrhHomeDocumentRow = Database['public']['Tables']['brh_home_documents']['Row']
// ============================================================
// Partner platform Row interfaces
// ============================================================

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
export type BrhPlatformSettingsRow = Database['public']['Tables']['brh_platform_settings']['Row']
export type BrhChiffrageRow = Database['public']['Tables']['brh_chiffrages']['Row']
export type BrhRecruitmentCommissionRow = Database['public']['Tables']['brh_recruitment_commissions']['Row']
export type BrhSimulationShareRow = Database['public']['Tables']['brh_simulation_shares']['Row']
export type BrhSimulationLeadRow = Database['public']['Tables']['brh_simulation_leads']['Row']
export type BrhSocialPostRow = Database['public']['Tables']['brh_social_posts']['Row']
export type BrhBadgeRow = Database['public']['Tables']['brh_badges']['Row']
export type BrhUserBadgeRow = Database['public']['Tables']['brh_user_badges']['Row']
export type BrhCompanyInvitationRow = Database['public']['Tables']['brh_company_invitations']['Row']

// Re-export `Database` pour les consommateurs qui importent depuis `@/types/database`.
// La forme `Database` vit dans `database-generated.ts` (auto-générée Supabase).
export type { Database } from './database-generated'
