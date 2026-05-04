/**
 * Phase 16.0.8 — API abonnements agences.
 */
import { supabase } from '@/lib/supabase'

export type AgenceTier = 'discovery' | 'standard' | 'premium' | 'expert'
export type StripeStatus = 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete'

export const TIER_LABELS: Record<AgenceTier, string> = {
  discovery: 'Discovery',
  standard: 'Standard',
  premium: 'Premium',
  expert: 'Expert',
}

export const TIER_PRICES: Record<AgenceTier, number> = {
  discovery: 0,
  standard: 390,
  premium: 990,
  expert: 2490,
}

export const TIER_QUOTAS: Record<AgenceTier, number | null> = {
  discovery: 5,
  standard: 30,
  premium: 100,
  expert: null,
}

export interface AgenceSubscription {
  id: string
  agence_id: string
  signer_profile_id: string | null
  tier: AgenceTier
  monthly_lead_quota: number | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  stripe_status: StripeStatus | null
  current_month_claims: number
  current_period_start: string
  current_period_end: string
  created_at: string
  updated_at: string
}

export const agenceSubscriptionsApi = {
  async getMine(): Promise<AgenceSubscription | null> {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null
    const { data, error } = await supabase
      .from('brh_agence_subscriptions')
      .select('*')
      .eq('signer_profile_id', user.id)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as AgenceSubscription | null
  },

  async getByAgenceId(agenceId: string): Promise<AgenceSubscription | null> {
    const { data, error } = await supabase
      .from('brh_agence_subscriptions')
      .select('*')
      .eq('agence_id', agenceId)
      .maybeSingle()
    if (error) throw error
    return (data ?? null) as AgenceSubscription | null
  },

  /** Création initiale (depuis onboarding). Appelée après création de l'agence. */
  async create(payload: {
    agenceId: string
    signerProfileId: string
    tier: AgenceTier
  }): Promise<AgenceSubscription> {
    const { data, error } = await supabase
      .from('brh_agence_subscriptions')
      .insert({
        agence_id: payload.agenceId,
        signer_profile_id: payload.signerProfileId,
        tier: payload.tier,
        // monthly_lead_quota auto-rempli par le trigger DB
      })
      .select()
      .single()
    if (error) throw error
    return data as AgenceSubscription
  },

  /** Claim atomique d'un lead via RPC SQL (vérifie quota + crée assignment). */
  async claimLead(prospectId: number, agenceId: string): Promise<string> {
    const { data, error } = await supabase.rpc('brh_grant_lead_claim', {
      p_agence_id: agenceId,
      p_prospect_id: prospectId,
    })
    if (error) throw error
    return data as string
  },
}
