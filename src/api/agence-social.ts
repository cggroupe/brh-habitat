/**
 * Phase 16.1 — API publications réseaux sociaux agence (récompense en leads bonus).
 */
import { supabase } from '@/lib/supabase'

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'linkedin'
  | 'tiktok'
  | 'google_business'

export type SocialPostType = 'post' | 'video' | 'article' | 'review'

export type SocialStatus =
  | 'en_attente'
  | 'en_cours_verification'
  | 'validee'
  | 'refusee'
  | 'expiree'

export interface AgenceSocialPost {
  id: string
  agence_id: string
  submitted_by: string | null
  platform: SocialPlatform
  post_type: SocialPostType
  post_url: string
  screenshot_path: string | null
  description: string | null
  reward_leads: number
  rewarded_at: string | null
  status: SocialStatus
  rejection_reason: string | null
  validated_at: string | null
  expiry_check_date: string | null
  expiry_confirmed: boolean
  admin_notes: string | null
  created_at: string
  updated_at: string
}

export interface SocialPostInsert {
  agence_id: string
  platform: SocialPlatform
  post_type: SocialPostType
  post_url: string
  screenshot_path?: string | null
  description?: string | null
  reward_leads?: number
}

export const PLATFORM_LABELS: Record<SocialPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  google_business: 'Google Business',
}

export const STATUS_LABELS: Record<SocialStatus, string> = {
  en_attente: 'En attente',
  en_cours_verification: 'En cours de vérification',
  validee: 'Validée ✓',
  refusee: 'Refusée',
  expiree: 'Expirée',
}

export const STATUS_COLORS: Record<SocialStatus, string> = {
  en_attente: 'bg-amber-100 text-amber-800 border border-amber-200',
  en_cours_verification: 'bg-blue-100 text-blue-800 border border-blue-200',
  validee: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  refusee: 'bg-red-100 text-red-800 border border-red-200',
  expiree: 'bg-slate-100 text-slate-600 border border-slate-200',
}

export const REWARD_LEADS_PER_PLATFORM: Record<SocialPlatform, number> = {
  facebook: 5,
  instagram: 5,
  linkedin: 5,
  tiktok: 8, // bonus engagement
  google_business: 3,
}

export const agenceSocialApi = {
  async list(agenceId: string): Promise<AgenceSocialPost[]> {
    const { data, error } = await supabase
      .from('brh_agence_social_posts')
      .select('*')
      .eq('agence_id', agenceId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []) as AgenceSocialPost[]
  },

  async monthlyValidatedCount(agenceId: string): Promise<number> {
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count, error } = await supabase
      .from('brh_agence_social_posts')
      .select('*', { count: 'exact', head: true })
      .eq('agence_id', agenceId)
      .eq('status', 'validee')
      .gte('validated_at', startOfMonth.toISOString())
    if (error) throw error
    return count ?? 0
  },

  async create(input: SocialPostInsert): Promise<AgenceSocialPost> {
    const { data, error } = await supabase
      .from('brh_agence_social_posts')
      .insert(input)
      .select('*')
      .single()
    if (error) throw error
    return data as AgenceSocialPost
  },
}
