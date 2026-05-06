/**
 * Phase 16.1 Step A — API économie unifiée de leads agences.
 *
 * 1 RPC central `brh_get_my_lead_breakdown` retourne la décomposition complète
 * (tier + 3 sources de bonus). L'UI consomme via `useMyLeadBreakdown()`.
 *
 * Mapping des erreurs `brh_grant_lead_claim` :
 *   - `quota_exhausted`        → "Quota mensuel atteint."
 *   - `no_active_subscription` → "Aucun abonnement actif."
 */
import { supabase } from '@/lib/supabase'

export interface LeadBreakdown {
  agenceId: string
  tier: 'discovery' | 'standard' | 'premium' | 'expert' | null
  /** NULL = illimité (tier expert). */
  tierQuota: number | null
  tierUsed: number
  /** NULL = illimité. */
  tierRemaining: number | null
  social: { unlocked: number; consumed: number; remaining: number }
  contribution: { unlocked: number; consumed: number; remaining: number }
  referral: { unlocked: number; consumed: number; remaining: number }
  bonusTotalRemaining: number
  /** NULL = illimité. */
  totalRemaining: number | null
}

export const agenceLeadEconomyApi = {
  async getMyBreakdown(): Promise<LeadBreakdown | null> {
    const { data, error } = await supabase.rpc('brh_get_my_lead_breakdown')
    if (error) throw error
    if (!data || (Array.isArray(data) && data.length === 0)) return null
    const row = Array.isArray(data) ? data[0] : data

    return {
      agenceId: row.agence_id as string,
      tier: row.tier_subscription as LeadBreakdown['tier'],
      tierQuota: row.tier_quota,
      tierUsed: row.tier_used,
      tierRemaining: row.tier_remaining,
      social: {
        unlocked: row.social_unlocked,
        consumed: row.social_consumed,
        remaining: row.social_remaining,
      },
      contribution: {
        unlocked: row.contribution_unlocked,
        consumed: row.contribution_consumed,
        remaining: row.contribution_remaining,
      },
      referral: {
        unlocked: row.referral_unlocked,
        consumed: row.referral_consumed,
        remaining: row.referral_remaining,
      },
      bonusTotalRemaining: row.bonus_total_remaining,
      totalRemaining: row.total_remaining,
    }
  },
}

/** Mapping erreurs RPC `brh_grant_lead_claim` → message FR pour toast UI. */
export function mapClaimError(err: { message?: string; code?: string }): Error {
  const msg = err.message ?? ''
  if (msg.includes('quota_exhausted')) {
    return new Error(
      'Quota mensuel atteint et aucun lead bonus disponible. Publiez sur les réseaux ou parrainez une agence pour débloquer plus de leads.',
    )
  }
  if (msg.includes('no_active_subscription')) {
    return new Error('Aucun abonnement actif. Souscrivez un forfait pour claim des leads.')
  }
  return new Error(msg || 'Erreur lors du claim du lead.')
}
