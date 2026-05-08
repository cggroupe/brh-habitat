/**
 * Phase 11.7 — API Leaderboard agences Bretagne (refonte UX MLM 2026-05-08).
 */
import { supabase } from '@/lib/supabase'

export type LeaderboardWindow = 30 | 90 | 365

export interface LeaderboardRow {
  rank: number
  agence_id: string
  raison_sociale: string
  commune: string | null
  departement: string | null
  status: string
  leads_claimed: number
  contributions_count: number
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
  is_me: boolean
}

export interface MlmTreeNode {
  level: number
  agence_id: string
  parent_agence_id: string | null
  raison_sociale: string
  commune: string | null
  status: string
  signed_at: string | null
  total_filleuls: number
  leads_signes: number
}

export const agenceLeaderboardApi = {
  async list(windowDays: LeaderboardWindow = 30, limit = 50): Promise<LeaderboardRow[]> {
    const { data, error } = await supabase.rpc('brh_agence_leaderboard', {
      p_window_days: windowDays,
      p_limit: limit,
    })
    if (error) throw error
    return (data ?? []) as LeaderboardRow[]
  },

  async mlmTree(agenceId?: string): Promise<MlmTreeNode[]> {
    const { data, error } = await supabase.rpc('brh_agence_mlm_tree', {
      p_agence_id: agenceId ?? null,
    })
    if (error) throw error
    return (data ?? []) as MlmTreeNode[]
  },
}
